import { describe, expect, test } from "vitest";
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

  test("lastActiveAt max; streak follows the more recent side", () => {
    const a = st({ lastActiveAt: 10, currentStreak: 2 });
    const b = st({ lastActiveAt: 20, currentStreak: 5 });
    expect(mergeState(a, b)).toMatchObject({ lastActiveAt: 20, currentStreak: 5 });
    expect(mergeState(b, a)).toMatchObject({ lastActiveAt: 20, currentStreak: 5 });
  });

  test("quizStats per-field max; ratings by newer side", () => {
    const a = st({ lastActiveAt: 1, quizStats: { k: { correct: 5, wrong: 1 } }, ratings: { vocab: 1000, kanji: 900 } });
    const b = st({ lastActiveAt: 2, quizStats: { k: { correct: 3, wrong: 4 }, z: { correct: 1, wrong: 0 } }, ratings: { vocab: 1100 } });
    const m = mergeState(a, b);
    expect(m.quizStats).toEqual({ k: { correct: 5, wrong: 4 }, z: { correct: 1, wrong: 0 } });
    expect(m.ratings).toEqual({ vocab: 1100, kanji: 900 });
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
