import { describe, it, expect } from "vitest";
import {
  advance,
  cardKey,
  getTodayQueue,
  newLearningState,
  parseCardKey,
  masteryLevel,
  pickMode,
  INTERVALS,
} from "@/lib/srs";
import type { LearningState } from "@/lib/types";

const DAY = 86_400_000;
const NOW = 1_700_000_000_000; // fixed reference time

describe("cardKey", () => {
  it("joins mode and id with colon", () => {
    expect(cardKey("kanji", "日")).toBe("kanji:日");
    expect(cardKey("vocab", "食べる")).toBe("vocab:食べる");
  });

  it("roundtrips via parseCardKey", () => {
    const parsed = parseCardKey("sentence:s1");
    expect(parsed.mode).toBe("sentence");
    expect(parsed.cardId).toBe("s1");
  });

  it("parseCardKey handles ids with colons", () => {
    const parsed = parseCardKey("kanji:a:b:c");
    expect(parsed.mode).toBe("kanji");
    expect(parsed.cardId).toBe("a:b:c");
  });
});

describe("advance — correct answer", () => {
  it("box 1 → 2 on correct", () => {
    const s = newLearningState("kanji", "日", NOW);
    const next = advance(s, true, NOW);
    expect(next.box).toBe(2);
    expect(next.nextDue).toBe(NOW + INTERVALS[2] * DAY);
    expect(next.correctStreak).toBe(1);
    expect(next.lastReviewed).toBe(NOW);
  });

  it("box 5 stays at 5 on correct (cap)", () => {
    const s: LearningState = { ...newLearningState("kanji", "日", NOW), box: 5 };
    const next = advance(s, true, NOW);
    expect(next.box).toBe(5);
    expect(next.nextDue).toBe(NOW + 14 * DAY);
  });
});

describe("advance — wrong answer (choice mode, default)", () => {
  it("resets to box 1 and resets streak", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 4,
      correctStreak: 3,
    };
    const next = advance(s, false, NOW);
    expect(next.box).toBe(1);
    expect(next.nextDue).toBe(NOW + DAY);
    expect(next.correctStreak).toBe(0);
  });

  it("explicit choice mode resets to box 1", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 5,
      correctStreak: 5,
    };
    const next = advance(s, false, NOW, "choice");
    expect(next.box).toBe(1);
    expect(next.correctStreak).toBe(0);
  });
});

describe("advance — wrong answer (typed mode)", () => {
  it("demotes box by 1 instead of resetting", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 5,
      correctStreak: 5,
    };
    const next = advance(s, false, NOW, "typed");
    expect(next.box).toBe(4);
    expect(next.nextDue).toBe(NOW + DAY);
    expect(next.correctStreak).toBe(0);
  });

  it("box 1 stays at 1 (floor)", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 1,
    };
    const next = advance(s, false, NOW, "typed");
    expect(next.box).toBe(1);
  });

  it("box 2 typed wrong → box 1", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 2,
    };
    const next = advance(s, false, NOW, "typed");
    expect(next.box).toBe(1);
  });
});

describe("pickMode", () => {
  it("returns 'choice' when box < threshold", () => {
    expect(pickMode(1, 4)).toBe("choice");
    expect(pickMode(3, 4)).toBe("choice");
  });

  it("returns 'typed' when box >= threshold", () => {
    expect(pickMode(4, 4)).toBe("typed");
    expect(pickMode(5, 4)).toBe("typed");
  });

  it("threshold 2 still keeps box 1 in choice", () => {
    expect(pickMode(1, 2)).toBe("choice");
    expect(pickMode(2, 2)).toBe("typed");
  });

  it("threshold 5 keeps box 4 in choice", () => {
    expect(pickMode(4, 5)).toBe("choice");
    expect(pickMode(5, 5)).toBe("typed");
  });
});

describe("getTodayQueue", () => {
  it("returns all due reviews", () => {
    const states: LearningState[] = Array.from({ length: 50 }, (_, i) => ({
      cardKey: `kanji:k${i}`,
      mode: "kanji" as const,
      cardId: `k${i}`,
      box: 2 as const,
      nextDue: NOW - 1000,
      correctStreak: 1,
      lastReviewed: NOW - DAY * 2,
    }));
    const q = getTodayQueue(states, NOW);
    expect(q.due).toHaveLength(50);
    expect(q.new).toHaveLength(0);
  });

  it("returns all new cards", () => {
    const states: LearningState[] = Array.from({ length: 30 }, (_, i) => ({
      cardKey: `kanji:k${i}`,
      mode: "kanji" as const,
      cardId: `k${i}`,
      box: 1 as const,
      nextDue: NOW,
      correctStreak: 0,
      lastReviewed: 0,
    }));
    const q = getTodayQueue(states, NOW);
    expect(q.new).toHaveLength(30);
    expect(q.due).toHaveLength(0);
  });

  it("excludes cards where nextDue is in future", () => {
    const states: LearningState[] = [
      {
        cardKey: "kanji:a",
        mode: "kanji",
        cardId: "a",
        box: 3,
        nextDue: NOW + DAY * 5,
        correctStreak: 2,
        lastReviewed: NOW - DAY,
      },
    ];
    const q = getTodayQueue(states, NOW);
    expect(q.due).toHaveLength(0);
    expect(q.new).toHaveLength(0);
  });

  it("sorts due cards by nextDue ascending", () => {
    const states: LearningState[] = [
      {
        cardKey: "kanji:a",
        mode: "kanji",
        cardId: "a",
        box: 2,
        nextDue: NOW - DAY * 5,
        correctStreak: 1,
        lastReviewed: NOW - DAY * 6,
      },
      {
        cardKey: "kanji:b",
        mode: "kanji",
        cardId: "b",
        box: 2,
        nextDue: NOW - DAY * 10,
        correctStreak: 1,
        lastReviewed: NOW - DAY * 11,
      },
    ];
    const q = getTodayQueue(states, NOW);
    expect(q.due[0].cardId).toBe("b");
    expect(q.due[1].cardId).toBe("a");
  });
});

describe("masteryLevel", () => {
  it("undefined → new", () => {
    expect(masteryLevel(undefined)).toBe("new");
  });

  it("lastReviewed 0 → new", () => {
    const s = newLearningState("kanji", "日", NOW);
    expect(masteryLevel(s)).toBe("new");
  });

  it("box 1-3 reviewed → learning", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 2,
      lastReviewed: NOW,
    };
    expect(masteryLevel(s)).toBe("learning");
  });

  it("box 4+ → mastered", () => {
    const s: LearningState = {
      ...newLearningState("kanji", "日", NOW),
      box: 4,
      lastReviewed: NOW,
    };
    expect(masteryLevel(s)).toBe("mastered");
  });
});
