import { describe, it, expect } from "vitest";
import { subjectMastery, sumMastery } from "@/lib/subject-mastery";
import type { LearningState } from "@/lib/types";

const s = (mode: LearningState["mode"], cardId: string, box: LearningState["box"], lastReviewed = 10): [string, LearningState] => [
  `${mode}:${cardId}`,
  { cardKey: `${mode}:${cardId}`, mode, cardId, box, nextDue: 0, correctStreak: 0, lastReviewed },
];

describe("subjectMastery", () => {
  it("splits the pool into mastered / learning / fresh and ignores other modes and out-of-pool cards", () => {
    const states = Object.fromEntries([
      s("vocab", "a", 5),
      s("vocab", "b", 4),
      s("vocab", "c", 3),
      s("vocab", "d", 1, 0),
      s("vocab", "gone", 5),
      s("kanji", "e", 5),
    ]);
    expect(subjectMastery(states, "vocab", ["a", "b", "c", "d", "e"])).toEqual({
      total: 5, mastered: 2, learning: 1, fresh: 2,
    });
  });
  it("handles an empty pool", () => {
    expect(subjectMastery({}, "vocab", [])).toEqual({ total: 0, mastered: 0, learning: 0, fresh: 0 });
  });
});

describe("sumMastery", () => {
  it("adds every field across subjects", () => {
    expect(
      sumMastery([
        { total: 10, mastered: 2, learning: 3, fresh: 5 },
        { total: 4, mastered: 1, learning: 0, fresh: 3 },
      ]),
    ).toEqual({ total: 14, mastered: 3, learning: 3, fresh: 8 });
  });

  it("is all zeros for no subjects (pre-hydration)", () => {
    expect(sumMastery([])).toEqual({ total: 0, mastered: 0, learning: 0, fresh: 0 });
  });
});
