import { describe, expect, it } from "vitest";
import { buildUndo, planRespace, planUndo } from "@/lib/respace";
import type { LearningState } from "@/lib/types";

const NOW = new Date(2026, 10, 2, 12, 0, 0).getTime();
const DAY = 86_400_000;

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
  const states = mk(300, (i) => NOW - (300 - i) * 3_600_000);
  it("balances days, day 0 capped by goal, only nextDue changes", () => {
    const { changes, perDay, overdue } = planRespace(states, NOW, 14, 20);
    expect(overdue).toBe(300);
    expect(perDay.reduce((a, b) => a + b, 0)).toBe(300);
    expect(perDay[0]).toBe(20);
    expect(Math.max(...perDay.slice(1))).toBeLessThanOrEqual(Math.ceil(280 / 13));
    expect(Object.keys(changes)).toHaveLength(280);
    for (const v of Object.values(changes)) expect(v).toBeGreaterThan(NOW);
  });
  it("oldest due stays today; deterministic", () => {
    const a = planRespace(states, NOW, 7, 20);
    expect(a.changes["vocab:0000"]).toBeUndefined();
    expect(planRespace(states, NOW, 7, 20)).toEqual(a);
  });
  it("is a no-op when run again", () => {
    const first = planRespace(states, NOW, 14, 20);
    const again = planRespace(apply(states, first.changes), NOW, 14, 20);
    expect(again.overdue).toBe(20);
    expect(again.changes).toEqual({});
  });
  it("ignores new and future cards", () => {
    const s = mk(5, () => NOW + DAY);
    s["vocab:0000"] = { ...s["vocab:0000"], nextDue: NOW - 1, lastReviewed: 0 };
    expect(planRespace(s, NOW, 7, 20).overdue).toBe(0);
  });
});

describe("undo", () => {
  const states = mk(100, (i) => NOW - (100 - i) * 3_600_000);
  const { changes } = planRespace(states, NOW, 7, 10);
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
