import { describe, it, expect } from "vitest";
import { buildReviewDeck } from "@/lib/review-deck";
import type { LearningState } from "@/lib/types";

const NOW = 1000;
const st = (mode: LearningState["mode"], cardId: string, nextDue: number, lastReviewed = 1) =>
  [`${mode}:${cardId}`, { cardKey: `${mode}:${cardId}`, mode, cardId, box: 1, nextDue, correctStreak: 0, lastReviewed } as LearningState] as const;
const all = () => true;

describe("buildReviewDeck", () => {
  it("is empty when nothing is due", () => {
    const s = Object.fromEntries([st("kanji", "a", NOW + 1), st("vocab", "b", 0, 0)]);
    expect(buildReviewDeck(s, NOW, all)).toEqual([]);
    expect(buildReviewDeck({}, NOW, all)).toEqual([]);
  });

  it("ignores modes outside the four and filtered-out cards", () => {
    const s = Object.fromEntries([st("conjugation", "c", 0), st("kanji", "gone", 0), st("kanji", "k", 0)]);
    expect(buildReviewDeck(s, NOW, (_, id) => id !== "gone")).toEqual([{ mode: "kanji", cardId: "k" }]);
  });

  it("orders most overdue first within a mode and interleaves modes", () => {
    const s = Object.fromEntries([
      st("kanji", "k2", 200), st("kanji", "k1", 100),
      st("vocab", "v1", 300), st("grammar", "pattern:g1", 50),
    ]);
    expect(buildReviewDeck(s, NOW, all)).toEqual([
      { mode: "kanji", cardId: "k1" },
      { mode: "vocab", cardId: "v1" },
      { mode: "grammar", cardId: "g1" },
      { mode: "kanji", cardId: "k2" },
    ]);
  });

  it("caps the deck", () => {
    const s = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => st(i % 2 ? "kanji" : "vocab", `x${i}`, i)),
    );
    expect(buildReviewDeck(s, NOW, all)).toHaveLength(20);
    expect(buildReviewDeck(s, NOW, all, 5)).toHaveLength(5);
  });
});
