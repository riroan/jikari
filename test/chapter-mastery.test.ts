import { describe, it, expect } from "vitest";
import { aggregateChapterMastery } from "@/lib/chapter-mastery";
import type {
  CardMode,
  ChapterMember,
  GrammarCard,
  LearningState,
} from "@/lib/types";

const m = (mode: CardMode, cardId: string): ChapterMember => ({
  chapterId: "test-ch",
  mode,
  cardId,
});

const allExist = () => true;
const noneExist = () => false;
const box1 = () => 1 as LearningState["box"];
const box5 = () => 5 as LearningState["box"];

describe("aggregateChapterMastery — empty + degenerate", () => {
  it("0 members → ratio 0, validMembers 0", () => {
    const r = aggregateChapterMastery([], allExist, box1);
    expect(r).toEqual({
      validMembers: 0,
      staleMembers: 0,
      masteredCount: 0,
      ratio: 0,
    });
  });

  it("all members stale (no card exists) → ratio 0, no divide-by-zero", () => {
    const r = aggregateChapterMastery(
      [m("vocab", "ghost1"), m("vocab", "ghost2"), m("kanji", "ghost3")],
      noneExist,
      box5,
    );
    expect(r.validMembers).toBe(0);
    expect(r.staleMembers).toBe(3);
    expect(r.masteredCount).toBe(0);
    expect(r.ratio).toBe(0);
  });
});

describe("aggregateChapterMastery — happy paths", () => {
  it("all members box ≥ 4 → ratio 1.0", () => {
    const r = aggregateChapterMastery(
      [m("vocab", "a"), m("vocab", "b"), m("kanji", "c")],
      allExist,
      box5,
    );
    expect(r).toEqual({
      validMembers: 3,
      staleMembers: 0,
      masteredCount: 3,
      ratio: 1,
    });
  });

  it("all members box 1 (never reviewed) → ratio 0", () => {
    const r = aggregateChapterMastery(
      [m("vocab", "a"), m("vocab", "b"), m("vocab", "c"), m("vocab", "d"), m("vocab", "e")],
      allExist,
      box1,
    );
    expect(r.validMembers).toBe(5);
    expect(r.masteredCount).toBe(0);
    expect(r.ratio).toBe(0);
  });

  it("mixed boxes [5,4,3,2,1] → 2/5 = 0.4", () => {
    const boxes: Record<string, LearningState["box"]> = {
      a: 5,
      b: 4,
      c: 3,
      d: 2,
      e: 1,
    };
    const getBox = (_mode: CardMode, id: string) => boxes[id] ?? (1 as const);
    const r = aggregateChapterMastery(
      [m("vocab", "a"), m("vocab", "b"), m("vocab", "c"), m("vocab", "d"), m("vocab", "e")],
      allExist,
      getBox,
    );
    expect(r.masteredCount).toBe(2); // boxes 5 + 4
    expect(r.validMembers).toBe(5);
    expect(r.ratio).toBeCloseTo(0.4, 5);
  });
});

describe("aggregateChapterMastery — stale handling (fail-soft)", () => {
  it("partial stale: only valid members count toward denominator", () => {
    const exists = (mode: CardMode, id: string) => id !== "ghost";
    const getBox = (_mode: CardMode, id: string) =>
      (id === "mastered" ? 5 : 1) as LearningState["box"];

    const r = aggregateChapterMastery(
      [
        m("vocab", "mastered"),
        m("vocab", "learning"),
        m("vocab", "ghost"),
        m("kanji", "ghost"),
      ],
      exists,
      getBox,
    );
    expect(r.validMembers).toBe(2); // 'mastered', 'learning'
    expect(r.staleMembers).toBe(2); // both ghosts (different modes)
    expect(r.masteredCount).toBe(1);
    expect(r.ratio).toBe(0.5);
  });
});

describe("aggregateChapterMastery — grammar subtyped SRS keys", () => {
  it("uses pattern: prefix for grammar pattern cards via grammarLookup", () => {
    const grammarCard: GrammarCard = {
      id: "pattern-tai",
      type: "pattern",
      pattern: "〜たい",
      koreanStructure: "〜고 싶다",
      meaningKo: "want",
      examples: [],
      quizzes: [],
      jlptLevel: 5,
    };
    const lookup = (id: string) =>
      id === "pattern-tai" ? grammarCard : undefined;

    const seenKeys: string[] = [];
    const getBox = (mode: CardMode, key: string) => {
      seenKeys.push(`${mode}:${key}`);
      return (key === "pattern:pattern-tai" ? 5 : 1) as LearningState["box"];
    };

    const r = aggregateChapterMastery(
      [m("grammar", "pattern-tai")],
      allExist,
      getBox,
      lookup,
    );

    expect(seenKeys).toEqual(["grammar:pattern:pattern-tai"]);
    expect(r.masteredCount).toBe(1);
    expect(r.ratio).toBe(1);
  });

  it("falls back to bare id when no grammar lookup provided", () => {
    const seenKeys: string[] = [];
    const getBox = (mode: CardMode, key: string) => {
      seenKeys.push(`${mode}:${key}`);
      return 1 as LearningState["box"];
    };
    aggregateChapterMastery([m("grammar", "pattern-tai")], allExist, getBox);
    expect(seenKeys).toEqual(["grammar:pattern-tai"]);
  });
});

describe("aggregateChapterMastery — conjugation/adjective edge", () => {
  it("conjugation/adjective members are flagged stale (derive from vocab, not in chapter_members)", () => {
    // Real cardExists in ChapterMastery component returns false for these modes.
    const exists = (mode: CardMode) =>
      mode !== "conjugation" && mode !== "adjective";
    const getBox = () => 5 as LearningState["box"];

    const r = aggregateChapterMastery(
      [m("conjugation", "verb1"), m("vocab", "v1")],
      exists,
      getBox,
    );
    expect(r.staleMembers).toBe(1);
    expect(r.validMembers).toBe(1);
    expect(r.ratio).toBe(1);
  });
});
