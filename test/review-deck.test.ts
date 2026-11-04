import { describe, it, expect } from "vitest";
import { buildReviewDeck, REVIEW_DUE_KEYS } from "@/lib/review-deck";
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

  it("ignores listening/unknown modes and filtered-out cards", () => {
    const s = Object.fromEntries([st("listening" as LearningState["mode"], "l", 0), st("kanji", "gone", 0), st("kanji", "k", 0)]);
    expect(buildReviewDeck(s, NOW, (_, id) => id !== "gone")).toEqual([{ mode: "kanji", cardId: "k" }]);
  });

  it("covers all 8 modes, oldest due first, splitting sentence vs particle", () => {
    const s = Object.fromEntries([
      st("kanji", "k", 8), st("vocab", "v", 7), st("sentence", "s", 6), st("sentence", "p", 5),
      st("conjugation", "v1:basic", 4), st("adjective", "a1:kuru", 3),
      st("grammar", "particle:g", 2), st("expression", "e", 1),
      st("kanji", "k0", 0),
    ]);
    const exists = (m: string, id: string) => (m === "particle" ? id === "p" : m === "sentence" ? id === "s" : true);
    const deck = buildReviewDeck(s, NOW, exists);
    expect(deck.map((d) => d.mode)).toEqual([
      "kanji", "vocab", "sentence", "particle", "conjugation", "adjective", "grammar", "expression", "kanji",
    ]);
    expect(deck[0].cardId).toBe("k0");
    expect(deck.find((d) => d.mode === "grammar")!.cardId).toBe("g");
    expect(deck.find((d) => d.mode === "conjugation")!.cardId).toBe("v1:basic");
    expect(buildReviewDeck(s, NOW, exists, 8)).toHaveLength(8);
  });

  it("REVIEW_DUE_KEYS matches the due keys home counts for every reviewed subject", () => {
    expect([...REVIEW_DUE_KEYS].sort()).toEqual(
      ["adjective", "conjugation", "expression", "grammar", "kanji", "sentence_particle", "sentence_vocab", "vocab"],
    );
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
