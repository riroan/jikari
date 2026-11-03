import { describe, expect, it } from "vitest";
import { buildUndo, mergeUndo, planRespace, planUndo } from "@/lib/respace";
import type { LearningState } from "@/lib/types";

const NOW = new Date(2026, 10, 2, 12, 0, 0).getTime();
const DAY = 86_400_000;
const E = new Set<string>();

function mk(n: number, nextDue: (i: number) => number, box: 1 | 2 | 3 | 4 | 5 = 3) {
  const m: Record<string, LearningState> = {};
  for (let i = 0; i < n; i++) {
    const k = `vocab:${String(i).padStart(4, "0")}`;
    m[k] = { cardKey: k, mode: "vocab", cardId: k, box, nextDue: nextDue(i), correctStreak: 1, lastReviewed: NOW - 30 * DAY };
  }
  return m;
}
const apply = (s: Record<string, LearningState>, c: Record<string, number>) => {
  const o = { ...s };
  for (const [k, v] of Object.entries(c)) o[k] = { ...o[k], nextDue: v };
  return o;
};

describe("planRespace", () => {
  const states = mk(300, (i) => NOW - DAY - (300 - i) * 3_600_000);
  it("balances days, day 0 capped by goal, only nextDue changes", () => {
    const { changes, perDay, overdue } = planRespace(states, NOW, 14, 20, E, E);
    expect(overdue).toBe(300);
    expect(perDay.reduce((a, b) => a + b, 0)).toBe(300);
    expect(perDay[0]).toBe(20);
    expect(Math.max(...perDay.slice(1))).toBeLessThanOrEqual(Math.ceil(280 / 13));
    expect(Object.keys(changes)).toHaveLength(280);
    for (const v of Object.values(changes)) expect(v).toBeGreaterThan(NOW);
  });
  it("oldest due stays today; deterministic", () => {
    const a = planRespace(states, NOW, 7, 20, E, E);
    expect(a.changes["vocab:0000"]).toBeUndefined();
    expect(planRespace(states, NOW, 7, 20, E, E)).toEqual(a);
  });
  it("is a no-op when run again", () => {
    const first = planRespace(states, NOW, 14, 20, E, E);
    const again = planRespace(apply(states, first.changes), NOW, 14, 20, E, E);
    expect(again.overdue).toBe(20);
    expect(again.changes).toEqual({});
  });
  it("ignores orphan sentence states and they do not use day-0 slots", () => {
    const s = mk(30, (i) => NOW - 2 * DAY - i * 1000);
    const orphans: Record<string, LearningState> = {};
    for (let i = 0; i < 10; i++) {
      const k = `sentence:x${i}`;
      orphans[k] = { cardKey: k, mode: "sentence", cardId: `x${i}`, box: 1, nextDue: NOW - 30 * DAY, correctStreak: 0, lastReviewed: NOW - 40 * DAY };
    }
    const r = planRespace({ ...s, ...orphans }, NOW, 7, 20, new Set(["a"]), new Set(["b"]));
    expect(r.overdue).toBe(30);
    expect(r.perDay[0]).toBe(20);
    expect(Object.keys(r.changes).some((k) => k.startsWith("sentence:"))).toBe(false);
    const ok = planRespace(orphans, NOW, 7, 20, new Set(["x1"]), E);
    expect(ok.overdue).toBe(1);
  });
  it("leaves cards due today / lapses from today untouched", () => {
    const s = mk(30, (i) => NOW - 2 * DAY - i * 1000);
    s["vocab:0000"] = { ...s["vocab:0000"], nextDue: NOW - 3_600_000 }; // earlier today
    s["vocab:0001"] = { ...s["vocab:0001"], nextDue: NOW + DAY, lastReviewed: NOW - 1000, correctStreak: 0 }; // lapse
    const r = planRespace(s, NOW, 7, 5, E, E);
    expect(r.overdue).toBe(28);
    expect(r.changes["vocab:0000"]).toBeUndefined();
    expect(r.changes["vocab:0001"]).toBeUndefined();
  });
  it("ignores new and future cards", () => {
    const s = mk(5, () => NOW + DAY);
    s["vocab:0000"] = { ...s["vocab:0000"], nextDue: NOW - 1, lastReviewed: 0 };
    expect(planRespace(s, NOW, 7, 20, E, E).overdue).toBe(0);
  });
});

describe("undo", () => {
  const states = mk(100, (i) => NOW - DAY - (100 - i) * 3_600_000);
  const { changes } = planRespace(states, NOW, 7, 10, E, E);
  const snap = buildUndo(states, changes, NOW);
  it("restores exact previous nextDue", () => {
    const undone = apply(apply(states, changes), planUndo(apply(states, changes), snap));
    expect(undone).toEqual(states);
  });
  it("skips cards reviewed since", () => {
    const after = apply(states, changes);
    const k = Object.keys(changes)[0];
    after[k] = { ...after[k], lastReviewed: NOW + 1000, nextDue: NOW + 5 * DAY };
    const u = planUndo(after, snap);
    expect(u[k]).toBeUndefined();
    expect(Object.keys(u)).toHaveLength(Object.keys(changes).length - 1);
  });
});

describe("mergeUndo", () => {
  it("keeps the earliest prev per key", () => {
    const a = { appliedAt: 1, entries: [["k", 10, 20]] as [string, number, number][] };
    const b = { appliedAt: 2, entries: [["k", 20, 30], ["j", 5, 6]] as [string, number, number][] };
    const m = mergeUndo(a, b);
    expect(m.appliedAt).toBe(2);
    expect(m.entries).toEqual([["k", 10, 30], ["j", 5, 6]]);
  });
});
