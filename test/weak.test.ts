import { describe, it, expect } from "vitest";
import { weakCardIds } from "@/lib/weak";
import type { LearningState } from "@/lib/types";

const s = (cardId: string, p: Partial<LearningState> = {}, mode: LearningState["mode"] = "vocab"): [string, LearningState] => [
  `${mode}:${cardId}`,
  { cardKey: `${mode}:${cardId}`, mode, cardId, box: 1, nextDue: 0, correctStreak: 0, lastReviewed: 10, ...p },
];

describe("weakCardIds", () => {
  it("keeps only reviewed cards whose last answer was wrong, lowest box then newest first", () => {
    const states = Object.fromEntries([
      s("new", { lastReviewed: 0 }),
      s("ok", { correctStreak: 2, box: 3 }),
      s("b2", { box: 2, lastReviewed: 50 }),
      s("b1old", { lastReviewed: 20 }),
      s("b1new", { lastReviewed: 30 }),
      s("other", {}, "kanji"),
    ]);
    expect(weakCardIds(states, "vocab")).toEqual(["b1new", "b1old", "b2"]);
  });
  it("respects the pool", () => {
    const states = Object.fromEntries([s("a"), s("b")]);
    expect(weakCardIds(states, "vocab", new Set(["b"]))).toEqual(["b"]);
  });
  it("returns [] for empty states or an empty pool", () => {
    expect(weakCardIds({}, "vocab")).toEqual([]);
    expect(weakCardIds(Object.fromEntries([s("a")]), "vocab", new Set())).toEqual([]);
  });
});
