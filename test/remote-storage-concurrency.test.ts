import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { __resetRemoteStorageForTests, getSyncStatus, markReplaceNext, MERGED_EVENT, remoteStorage } from "@/lib/remote-storage";

const ls = (id: string, lastReviewed: number) => ({
  cardKey: `vocab:${id}`, mode: "vocab", cardId: id, box: 2, nextDue: 1, correctStreak: 1, lastReviewed,
});
const full = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 6, learningStates: {}, heatmap: {}, lastActiveAt: 0, currentStreak: 0,
  quizStats: {}, ratings: {}, settings: { theme: "system", showFurigana: true, typingThresholdBox: 4, dailyGoal: 20 }, ...over,
});
const val = (state: object) => JSON.stringify({ state, version: 6 });
const withTag = (body: object, etag?: string | null, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: etag ? { ETag: etag } : {} });

describe("remoteStorage: optimistic concurrency", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const puts = () => fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "PUT");
  const putHeader = (n: number, h: string) => ((puts()[n][1] as RequestInit).headers as Record<string, string>)[h];
  const putBody = (n: number) => JSON.parse((puts()[n][1] as RequestInit).body as string);

  beforeEach(() => {
    localStorage.clear();
    __resetRemoteStorageForTests();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function load(state = full(), etag: string | null = '"t0"') {
    fetchMock.mockResolvedValueOnce(withTag(state, etag));
    await remoteStorage.getItem("jikari");
  }

  test("PUT sends the GET's ETag as If-Match and adopts the tag returned by the PUT", async () => {
    await load();
    fetchMock.mockResolvedValue(withTag({ ok: true }, '"t1"'));
    remoteStorage.setItem("jikari", val(full({ lastActiveAt: 1 })));
    await vi.advanceTimersByTimeAsync(600);
    remoteStorage.setItem("jikari", val(full({ lastActiveAt: 2 })));
    await vi.advanceTimersByTimeAsync(600);
    expect(putHeader(0, "If-Match")).toBe('"t0"');
    expect(putHeader(1, "If-Match")).toBe('"t1"');
  });

  test("no ETag from an old server -> no If-Match (unconditional, as before)", async () => {
    await load(full(), null);
    fetchMock.mockResolvedValue(Response.json({ ok: true }));
    remoteStorage.setItem("jikari", val(full()));
    await vi.advanceTimersByTimeAsync(600);
    expect(putHeader(0, "If-Match")).toBeUndefined();
  });

  test("409: merges the server's newer state with ours, retries with the new tag, asks the store to re-hydrate", async () => {
    await load(full({ learningStates: { "vocab:a": ls("a", 1) } }));
    const merged = vi.fn();
    window.addEventListener(MERGED_EVENT, merged);
    // device B saved "b" meanwhile; our PUT (answer "a") conflicts
    fetchMock
      .mockResolvedValueOnce(withTag(full({ learningStates: { "vocab:a": ls("a", 1), "vocab:b": ls("b", 50) } }), '"t2"', 409))
      .mockResolvedValue(withTag({ ok: true }, '"t3"'));
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 700) } })));
    await vi.advanceTimersByTimeAsync(700);
    expect(puts()).toHaveLength(2);
    expect(putHeader(1, "If-Match")).toBe('"t2"');
    const body = putBody(1);
    expect(Object.keys(body.learningStates).sort()).toEqual(["vocab:a", "vocab:b"]);
    expect(body.learningStates["vocab:a"].lastReviewed).toBe(700);
    expect(merged).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("jikari-pending-v1")).toBeNull(); // cleared only after the successful retry
    window.removeEventListener(MERGED_EVENT, merged);
  });

  test("an answer in the window between the 409 merge and the rehydrate does not overwrite the merge", async () => {
    await load();
    fetchMock
      .mockResolvedValueOnce(withTag(full({ learningStates: { "vocab:b": ls("b", 50) } }), '"t2"', 409))
      .mockResolvedValue(withTag({ ok: true }, '"t3"'));
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 7) } })));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(600);
    // store has NOT rehydrated yet (still only knows "a"); user answers "c"
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 7), "vocab:c": ls("c", 60) } })));
    await vi.advanceTimersByTimeAsync(700);
    const last = putBody(puts().length - 1);
    expect(Object.keys(last.learningStates).sort()).toEqual(["vocab:a", "vocab:b", "vocab:c"]);
  });

  test("409 keeps the pending copy until a PUT finally succeeds", async () => {
    await load();
    fetchMock.mockResolvedValueOnce(withTag(full(), '"t2"', 409)).mockRejectedValue(new Error("down"));
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 7) } })));
    await vi.advanceTimersByTimeAsync(700);
    expect(localStorage.getItem("jikari-pending-v1")).not.toBeNull();
  });

  test("endless 409s are bounded and fall back to backoff (no tight loop)", async () => {
    await load();
    fetchMock.mockImplementation(async (_u: string, i?: RequestInit) =>
      i?.method === "PUT" ? withTag(full(), '"tx"', 409) : withTag(full(), '"tx"'));
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 7) } })));
    await vi.advanceTimersByTimeAsync(700);
    expect(puts().length).toBe(6); // 1 + 5 immediate merge-retries
    await vi.advanceTimersByTimeAsync(1000);
    expect(puts().length).toBe(6); // now waiting out a backoff
  });

  test("4xx other than 409 is still dropped", async () => {
    await load();
    fetchMock.mockResolvedValue(new Response("bad", { status: 400 }));
    remoteStorage.setItem("jikari", val(full()));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(puts()).toHaveLength(1);
  });
});

describe("remoteStorage: explicit replace (restore / reset)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const puts = () => fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "PUT");
  const putBody = (n: number) => JSON.parse((puts()[n][1] as RequestInit).body as string);
  const putHeader = (n: number, h: string) => ((puts()[n][1] as RequestInit).headers as Record<string, string>)[h];

  beforeEach(() => {
    localStorage.clear();
    __resetRemoteStorageForTests();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("restore of an older backup while a PUT is failing is not merged back into newer data", async () => {
    const newer = full({ lastActiveAt: 900, learningStates: { "vocab:new": ls("new", 900) } });
    const backup = full({ lastActiveAt: 10, learningStates: { "vocab:old": ls("old", 10) } });
    fetchMock.mockResolvedValueOnce(withTag(newer, '"t0"'));
    await remoteStorage.getItem("jikari");
    fetchMock.mockRejectedValue(new Error("down"));
    remoteStorage.setItem("jikari", val(newer)); // newer answers, PUT keeps failing
    await vi.advanceTimersByTimeAsync(600);
    markReplaceNext();
    remoteStorage.setItem("jikari", val(backup)); // user confirms restore of the older backup
    expect(JSON.parse(localStorage.getItem("jikari-pending-v1")!).replace).toBe(true);

    // app closed and reopened online: fresh GET returns the newer data
    __resetRemoteStorageForTests();
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(withTag(newer, '"t5"')).mockResolvedValue(withTag({ ok: true }, '"t6"'));
    const out = JSON.parse((await remoteStorage.getItem("jikari"))!);
    expect(Object.keys(out.state.learningStates)).toEqual(["vocab:old"]);
    await vi.advanceTimersByTimeAsync(10);
    expect(Object.keys(putBody(0).learningStates)).toEqual(["vocab:old"]);
    expect(putHeader(0, "If-Match")).toBe('"t5"'); // freshest tag, no merge
    expect(putHeader(0, "X-Jikari-Replace")).toBe("1"); // server must not merge it
    expect(localStorage.getItem("jikari-pending-v1")).toBeNull();
  });

  test("409 on a replace: re-GET the tag only (no merge), retry once with it", async () => {
    fetchMock.mockResolvedValueOnce(withTag(full(), '"t0"'));
    await remoteStorage.getItem("jikari");
    const backup = full({ learningStates: { "vocab:old": ls("old", 10) } });
    fetchMock
      .mockResolvedValueOnce(withTag(full({ learningStates: { "vocab:b": ls("b", 5) } }), '"t2"', 409))
      .mockResolvedValueOnce(withTag(full({ learningStates: { "vocab:b": ls("b", 5) } }), '"t3"')) // tag refresh GET
      .mockResolvedValue(withTag({ ok: true }, '"t4"'));
    markReplaceNext();
    remoteStorage.setItem("jikari", val(backup));
    await vi.advanceTimersByTimeAsync(700);
    expect(puts()).toHaveLength(2);
    expect(putHeader(1, "If-Match")).toBe('"t3"');
    expect(Object.keys(putBody(1).learningStates)).toEqual(["vocab:old"]);
  });

  test("a restore rejected with 4xx does not leave replace stuck: next 409 merges", async () => {
    fetchMock.mockResolvedValueOnce(withTag(full(), '"t0"'));
    await remoteStorage.getItem("jikari");
    fetchMock.mockResolvedValueOnce(new Response("bad", { status: 400 }));
    markReplaceNext();
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:old": ls("old", 10) } })));
    await vi.advanceTimersByTimeAsync(700);
    expect(puts()).toHaveLength(1);
    fetchMock
      .mockResolvedValueOnce(withTag(full({ learningStates: { "vocab:b": ls("b", 5) } }), '"t2"', 409))
      .mockResolvedValue(withTag({ ok: true }, '"t3"'));
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 20) } })));
    expect(JSON.parse(localStorage.getItem("jikari-pending-v1")!).replace).toBeUndefined();
    await vi.advanceTimersByTimeAsync(700);
    expect(putHeader(0, "X-Jikari-Replace")).toBe("1");
    expect(putHeader(1, "X-Jikari-Replace")).toBeUndefined();
    expect(Object.keys(putBody(2).learningStates).sort()).toEqual(["vocab:a", "vocab:b"]);
  });

  test("after the replace is saved, later writes merge normally again", async () => {
    fetchMock.mockResolvedValueOnce(withTag(full(), '"t0"'));
    await remoteStorage.getItem("jikari");
    fetchMock.mockResolvedValue(withTag({ ok: true }, '"t1"'));
    markReplaceNext();
    remoteStorage.setItem("jikari", val(full()));
    await vi.advanceTimersByTimeAsync(600);
    remoteStorage.setItem("jikari", val(full({ lastActiveAt: 3 })));
    expect(JSON.parse(localStorage.getItem("jikari-pending-v1")!).replace).toBeUndefined();
  });
});

describe("remoteStorage: snapshot queue durability", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const puts = () => fetchMock.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === "PUT");
  const putBody = (n: number) => JSON.parse((puts()[n][1] as RequestInit).body as string);
  const snapshot = (state: object) =>
    new Response(JSON.stringify(state), { headers: { "X-Jikari-Offline-Snapshot": "1" } });

  beforeEach(() => {
    localStorage.clear();
    __resetRemoteStorageForTests();
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("quota error: the in-memory queue beats the stale stored envelope, and the status is honest", async () => {
    fetchMock.mockResolvedValueOnce(snapshot(full()));
    await remoteStorage.getItem("jikari");
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 100) } }))); // persisted
    const real = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    remoteStorage.setItem("jikari", val(full({ learningStates: { "vocab:a": ls("a", 100), "vocab:b": ls("b", 200) } })));
    expect(getSyncStatus()).toBe("no-space");
    vi.mocked(Storage.prototype.setItem).mockImplementation(real);

    // stored envelope only has "a"; memory has "a"+"b"
    fetchMock.mockResolvedValueOnce(withTag(full(), '"t9"')).mockResolvedValue(withTag({ ok: true }, '"t10"'));
    const out = JSON.parse((await remoteStorage.getItem("jikari"))!);
    expect(Object.keys(out.state.learningStates).sort()).toEqual(["vocab:a", "vocab:b"]);
    await vi.advanceTimersByTimeAsync(10);
    expect(Object.keys(putBody(0).learningStates).sort()).toEqual(["vocab:a", "vocab:b"]);
    expect(getSyncStatus()).toBe("idle");
  });

  test("a permanently rejected payload is kept once (latest only) and the pending copy is removed", async () => {
    fetchMock.mockResolvedValueOnce(withTag(full(), '"t0"'));
    await remoteStorage.getItem("jikari");
    fetchMock.mockResolvedValue(new Response("bad", { status: 400 }));
    remoteStorage.setItem("jikari", val(full({ lastActiveAt: 1 })));
    await vi.advanceTimersByTimeAsync(600);
    expect(localStorage.getItem("jikari-pending-v1")).toBeNull();
    expect(JSON.parse(localStorage.getItem("jikari-pending-rejected-v1")!).value).toContain('"lastActiveAt":1');
    remoteStorage.setItem("jikari", val(full({ lastActiveAt: 2 })));
    await vi.advanceTimersByTimeAsync(600);
    expect(JSON.parse(localStorage.getItem("jikari-pending-rejected-v1")!).value).toContain('"lastActiveAt":2');
  });
});
