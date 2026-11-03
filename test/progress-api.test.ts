import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls: string[] = [];
let rows: Record<string, unknown[]> = {};
const conn = {
  query: vi.fn(async (sql: string, _params?: unknown[]) => {
    calls.push(sql.split(/\s+/).slice(0, 3).join(" "));
    if (sql.includes("GET_LOCK")) return [[{ l: 1 }], []];
    if (sql.includes("FROM learning_states")) return [rows.ls ?? [], []];
    if (sql.includes("FROM heatmap_days")) return [rows.hm ?? [], []];
    if (sql.includes("FROM quiz_stats")) return [[], []];
    if (sql.includes("FROM ratings")) return [[], []];
    if (sql.includes("FROM app_settings")) {
      // Like MySQL: a column that is not in the SELECT list is absent from the row.
      const row: Record<string, unknown> = { theme: "system", show_furigana: 1, typing_threshold_box: 4, last_active_at: 5, current_streak: 1, schema_version: 6 };
      if (sql.includes("daily_goal")) row.daily_goal = 50;
      return [[row], []];
    }
    return [[], []];
  }),
  beginTransaction: vi.fn(async () => void calls.push("BEGIN")),
  commit: vi.fn(async () => void calls.push("COMMIT")),
  rollback: vi.fn(async () => void calls.push("ROLLBACK")),
  release: vi.fn(),
};
vi.mock("@/lib/db/client", () => ({ getPool: () => ({ getConnection: async () => conn, query: conn.query }) }));

import { __resetDailyGoalFlagForTests, getProgress, putProgress } from "@/lib/db/progress";
import { progressTag, sameTag } from "@/lib/progress-tag";
import { GET, PUT } from "@/app/api/progress/route";

const body = (state: unknown) => ({ ...(state as object) });
const hm = (day: string, count: number) => ({ day, count });

beforeEach(() => {
  calls.length = 0;
  rows = { hm: [hm("2026-01-01", 1)] };
});

describe("progressTag", () => {
  test("independent of key order, changes with content", () => {
    expect(progressTag({ a: 1, b: { x: 1, y: 2 } })).toBe(progressTag({ b: { y: 2, x: 1 }, a: 1 }));
    expect(progressTag({ a: 1 })).not.toBe(progressTag({ a: 2 }));
  });
  test("sameTag tolerates weak/gzip decorations", () => {
    expect(sameTag('W/"abc"', '"abc"')).toBe(true);
    expect(sameTag('"abc-gzip"', '"abc"')).toBe(true);
    expect(sameTag('"abd"', '"abc"')).toBe(false);
  });
});

describe("getProgress settings", () => {
  test("reads the saved daily goal instead of always falling back to 20", async () => {
    const s = await getProgress(conn as never);
    expect(s.settings.dailyGoal).toBe(50);
  });
});

describe("missing app_settings.daily_goal column (migration 0013 not applied)", () => {
  const impl = conn.query.getMockImplementation()!;
  beforeEach(() => {
    __resetDailyGoalFlagForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    conn.query.mockImplementation(async (sql: string, p?: unknown[]) => {
      if (sql.includes("daily_goal")) throw Object.assign(new Error("Unknown column 'daily_goal' in 'field list'"), { errno: 1054 });
      return impl(sql, p);
    });
  });
  afterEach(() => {
    conn.query.mockImplementation(impl);
    vi.restoreAllMocks();
  });

  test("GET falls back to the default goal and warns once", async () => {
    expect((await getProgress(conn as never)).settings.dailyGoal).toBe(20);
    await getProgress(conn as never);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  test("PUT skips the column instead of throwing", async () => {
    const cur = await getProgress(conn as never);
    expect((await putProgress(cur, progressTag(cur))).ok).toBe(true);
    const sqls = conn.query.mock.calls.map(([q]) => String(q));
    expect(sqls.filter((q) => q.startsWith("INSERT INTO app_settings")).every((q) => !q.includes("daily_goal"))).toBe(true);
  });
});

describe("putProgress optimistic concurrency", () => {
  async function current() {
    return getProgress(conn as never);
  }

  test("matching If-Match writes under the named lock and returns the new tag", async () => {
    const cur = await current();
    calls.length = 0;
    const r = await putProgress(cur, progressTag(cur));
    expect(r.ok).toBe(true);
    expect(calls.indexOf("SELECT GET_LOCK(?, 10)")).toBe(0);
    expect(calls).toContain("DELETE FROM learning_states");
    expect(calls.at(-2)).toBe("COMMIT");
    expect(calls.at(-1)).toBe("SELECT RELEASE_LOCK(?)");
  });

  test("stale If-Match writes nothing, rolls back, returns current state + tag", async () => {
    const stale = progressTag(await current());
    rows.hm = [hm("2026-01-01", 1), hm("2026-01-02", 9)]; // another device saved meanwhile
    calls.length = 0;
    const r = await putProgress(await current(), stale);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.current.heatmap["2026-01-02"]).toBe(9);
      expect(r.tag).toBe(progressTag(r.current));
    }
    expect(calls).not.toContain("DELETE FROM learning_states");
    expect(calls).toContain("ROLLBACK");
    expect(calls.at(-1)).toBe("SELECT RELEASE_LOCK(?)"); // lock always released
  });

  test("missing If-Match (old client) is accepted unconditionally", async () => {
    const r = await putProgress(await current());
    expect(r.ok).toBe(true);
    expect(calls).toContain("DELETE FROM learning_states");
  });
});

describe("putProgress without If-Match", () => {
  const newer = { card_key: "vocab:b", mode: "vocab", card_id: "b", box: 3, next_due: 9, correct_streak: 2, last_reviewed: 500 };
  const inserted = () => conn.query.mock.calls.filter(([q]) => String(q).startsWith("INSERT INTO learning_states")).map(([, p]) => (p as unknown[][][])[0]);

  test("merges with the server's newer card instead of erasing it", async () => {
    rows.ls = [newer];
    const incoming = { ...(await getProgress(conn as never)), learningStates: {} };
    conn.query.mockClear();
    const r = await putProgress(incoming);
    expect(r.ok).toBe(true);
    expect(inserted()[0].map((x) => x[0])).toEqual(["vocab:b"]);
    if (r.ok) expect(r.merged?.learningStates["vocab:b"]).toBeTruthy();
  });

  test("replace + matching If-Match writes as-is", async () => {
    rows.ls = [newer];
    const cur = await getProgress(conn as never);
    conn.query.mockClear();
    const r = await putProgress({ ...cur, learningStates: {} }, progressTag(cur), true);
    expect(r.ok).toBe(true);
    expect(inserted()).toHaveLength(0);
  });

  test("replace + stale If-Match -> 409 path (nothing written)", async () => {
    const cur = await getProgress(conn as never);
    rows.ls = [newer];
    const r = await putProgress(cur, progressTag(cur), true);
    expect(r.ok).toBe(false);
  });
});

describe("/api/progress route", () => {
  const valid = {
    schemaVersion: 6, learningStates: {}, heatmap: {}, lastActiveAt: 0, currentStreak: 0,
    quizStats: {}, ratings: {}, settings: { theme: "system", showFurigana: true, typingThresholdBox: 4, dailyGoal: 20 },
  };
  const put = (headers: Record<string, string> = {}) =>
    PUT(new Request("http://x/api/progress", { method: "PUT", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body(valid)) }));

  test("GET exposes the version tag as ETag, equal to the tag of the body", async () => {
    const res = await GET(new Request("http://x/api/progress"));
    const state = await res.json();
    expect(res.headers.get("ETag")).toBe(progressTag(state));
  });

  test("PUT with stale tag -> 409 + current state + ETag; fresh tag -> 200 + new ETag", async () => {
    const etag = (await GET(new Request("http://x/api/progress"))).headers.get("ETag")!;
    rows.hm = [hm("2026-02-02", 4)];
    const conflict = await put({ "If-Match": etag });
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).heatmap).toEqual({ "2026-02-02": 4 });
    const fresh = conflict.headers.get("ETag")!;
    const ok = await put({ "If-Match": fresh });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("ETag")).toBeTruthy();
  });

  test("PUT without If-Match still works", async () => {
    expect((await put()).status).toBe(200);
  });
});
