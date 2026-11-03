import { describe, expect, test } from "vitest";
import { toLocalDateKey } from "@/lib/heatmap";
import { mergeState } from "@/lib/merge-state";
import { DEFAULT_SETTINGS, type LearningState, type PersistedState } from "@/lib/types";

const ls = (id: string, lastReviewed: number, box: LearningState["box"] = 1): LearningState => ({
  cardKey: `vocab:${id}`, mode: "vocab", cardId: id, box, nextDue: lastReviewed + 1000, correctStreak: box, lastReviewed,
});
const st = (p: Partial<PersistedState> = {}): PersistedState => ({
  schemaVersion: 6, learningStates: {}, heatmap: {}, lastActiveAt: 0, currentStreak: 0,
  quizStats: {}, ratings: {}, settings: { ...DEFAULT_SETTINGS }, ...p,
});

describe("mergeState", () => {
  test("learningStates: newer lastReviewed wins on either side, union otherwise", () => {
    const server = st({ learningStates: { "vocab:a": ls("a", 100, 2), "vocab:b": ls("b", 500, 3), "vocab:s": ls("s", 1) } });
    const local = st({ learningStates: { "vocab:a": ls("a", 200, 4), "vocab:b": ls("b", 300, 1), "vocab:l": ls("l", 1) } });
    const m = mergeState(server, local);
    expect(m.learningStates["vocab:a"].box).toBe(4);
    expect(m.learningStates["vocab:b"].box).toBe(3);
    expect(Object.keys(m.learningStates).sort()).toEqual(["vocab:a", "vocab:b", "vocab:l", "vocab:s"]);
  });

  test("heatmap: per-day max, union of days", () => {
    const m = mergeState(st({ heatmap: { d1: 5, d2: 1 } }), st({ heatmap: { d1: 3, d3: 7 } }));
    expect(m.heatmap).toEqual({ d1: 5, d2: 1, d3: 7 });
  });

  const DAY = 86_400_000;
  const key = (t: number) => toLocalDateKey(t);
  const NOW = new Date(2026, 5, 15, 12).getTime();

  test("streak is recomputed from the merged heatmap, not copied from either side", () => {
    const server = st({
      lastActiveAt: NOW,
      currentStreak: 3,
      heatmap: { [key(NOW)]: 2, [key(NOW - DAY)]: 1, [key(NOW - 2 * DAY)]: 4 },
    });
    // phone: offline 8-day-old snapshot, stale streak 9 and older lastActiveAt
    const local = st({ lastActiveAt: NOW - 8 * DAY, currentStreak: 9, heatmap: { [key(NOW - 8 * DAY)]: 1 } });
    const m = mergeState(server, local);
    expect(m.lastActiveAt).toBe(NOW);
    expect(m.currentStreak).toBe(3);
    expect(mergeState(local, server).currentStreak).toBe(3);
  });

  test("a stale offline snapshot must not reset the server's streak (local streak 0, older)", () => {
    const server = st({ lastActiveAt: NOW, currentStreak: 5, heatmap: Object.fromEntries([0, 1, 2, 3, 4].map((i) => [key(NOW - i * DAY), 1])) });
    const local = st({ lastActiveAt: NOW - 8 * DAY, currentStreak: 0 });
    expect(mergeState(server, local).currentStreak).toBe(5);
  });

  test("merge adds a local-only day: streak counts it", () => {
    const server = st({ lastActiveAt: NOW - DAY, heatmap: { [key(NOW - DAY)]: 1 } });
    const local = st({ lastActiveAt: NOW, heatmap: { [key(NOW)]: 1 } });
    expect(mergeState(server, local).currentStreak).toBe(2);
  });

  test("empty states keep streak 0", () => {
    expect(mergeState(st(), st()).currentStreak).toBe(0);
  });

  test("quizStats per-field max; ratings: server unless local changed vs base", () => {
    const a = st({ lastActiveAt: 1, quizStats: { k: { correct: 5, wrong: 1 } }, ratings: { vocab: 1000, kanji: 900 } });
    const b = st({ lastActiveAt: 2, quizStats: { k: { correct: 3, wrong: 4 }, z: { correct: 1, wrong: 0 } }, ratings: { vocab: 1100, kanji: 900 } });
    const m = mergeState(a, b, undefined, { vocab: 1000, kanji: 900 });
    expect(m.quizStats).toEqual({ k: { correct: 5, wrong: 4 }, z: { correct: 1, wrong: 0 } });
    expect(m.ratings).toEqual({ vocab: 1100, kanji: 900 }); // vocab changed locally, kanji did not
  });

  test("ratings: a stale local copy (unchanged vs base) never overwrites the server; no base -> server", () => {
    const server = st({ ratings: { vocab: 1300 } });
    const local = st({ lastActiveAt: 99, ratings: { vocab: 1000, kanji: 800 } });
    expect(mergeState(server, local, undefined, { vocab: 1000, kanji: 800 }).ratings).toEqual({ vocab: 1300, kanji: 800 });
    expect(mergeState(server, local).ratings).toEqual({ vocab: 1300, kanji: 800 });
  });

  test("settings: 3-way per field against base", () => {
    const base = { ...DEFAULT_SETTINGS };
    const server = st({ settings: { ...base, theme: "dark" } }); // changed elsewhere
    const local = st({ settings: { ...base, dailyGoal: 50 } }); // changed locally
    const m = mergeState(server, local, base);
    expect(m.settings).toEqual({ ...base, theme: "dark", dailyGoal: 50 });
    // without a base the server wins
    expect(mergeState(server, local).settings).toEqual(server.settings);
  });

  test("idempotent and commutative (no base)", () => {
    const a = st({ lastActiveAt: 5, learningStates: { "vocab:a": ls("a", 100), "vocab:x": ls("x", 9) }, heatmap: { d: 2 } });
    const b = st({ lastActiveAt: 7, learningStates: { "vocab:a": ls("a", 200), "vocab:y": ls("y", 9) }, heatmap: { d: 1, e: 1 } });
    const m = mergeState(a, b);
    expect(mergeState(a, m)).toEqual(m);
    expect(mergeState(m, b)).toEqual(m);
    expect(mergeState(b, a)).toEqual(m);
    expect(mergeState(m, m)).toEqual(m);
  });

  test("idempotent with base settings", () => {
    const base = { ...DEFAULT_SETTINGS };
    const server = st({ settings: { ...base, theme: "dark" } });
    const local = st({ settings: { ...base, dailyGoal: 10 } });
    const m = mergeState(server, local, base);
    expect(mergeState(server, m, base)).toEqual(m);
  });

  test("equal lastReviewed tie is deterministic regardless of order", () => {
    const x = ls("a", 100, 2);
    const y = { ...ls("a", 100, 3), nextDue: x.nextDue };
    const k = "vocab:a";
    expect(mergeState(st({ learningStates: { [k]: x } }), st({ learningStates: { [k]: y } })).learningStates[k])
      .toEqual(mergeState(st({ learningStates: { [k]: y } }), st({ learningStates: { [k]: x } })).learningStates[k]);
  });

  test("does not mutate inputs", () => {
    const a = st({ heatmap: { d: 1 } });
    const b = st({ heatmap: { d: 2 } });
    const sa = JSON.stringify(a), sb = JSON.stringify(b);
    mergeState(a, b);
    expect(JSON.stringify(a)).toBe(sa);
    expect(JSON.stringify(b)).toBe(sb);
  });
});
