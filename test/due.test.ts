import { describe, it, expect } from "vitest";
import { aggregateDueByKey, totalDue } from "@/lib/due";
import type { LearningState } from "@/lib/types";

const NOW = 1_000_000;

function s(
  mode: LearningState["mode"],
  cardId: string,
  partial: Partial<Omit<LearningState, "cardKey" | "mode" | "cardId">> = {},
): LearningState {
  return {
    cardKey: `${mode}:${cardId}`,
    mode,
    cardId,
    box: 1,
    nextDue: 0,
    correctStreak: 0,
    lastReviewed: 1,
    ...partial,
  };
}

describe("aggregateDueByKey", () => {
  it("returns empty object when there are no states", () => {
    expect(aggregateDueByKey({}, NOW, new Set(), new Set())).toEqual({});
  });

  it("excludes never-reviewed (new) cards", () => {
    const states = {
      "vocab:fresh": s("vocab", "fresh", { lastReviewed: 0, nextDue: 0 }),
      "vocab:reviewed": s("vocab", "reviewed", { nextDue: NOW - 1 }),
    };
    const result = aggregateDueByKey(states, NOW, new Set(), new Set());
    expect(result.vocab).toBe(1);
  });

  it("excludes states whose nextDue is still in the future", () => {
    const states = {
      "vocab:later": s("vocab", "later", { nextDue: NOW + 1_000_000 }),
      "vocab:now": s("vocab", "now", { nextDue: NOW }),
    };
    const result = aggregateDueByKey(states, NOW, new Set(), new Set());
    expect(result.vocab).toBe(1);
  });

  it("counts kanji/vocab/grammar/conjugation/adjective/expression by mode", () => {
    const modes: LearningState["mode"][] = [
      "kanji",
      "vocab",
      "grammar",
      "conjugation",
      "adjective",
      "expression",
    ];
    const states: Record<string, LearningState> = {};
    for (const m of modes) {
      states[`${m}:a`] = s(m, "a");
      states[`${m}:b`] = s(m, "b");
    }
    const result = aggregateDueByKey(states, NOW, new Set(), new Set());
    for (const m of modes) {
      expect(result[m]).toBe(2);
    }
  });

  it("splits sentence-mode states into vocab vs particle by id set", () => {
    const states = {
      "sentence:s1": s("sentence", "s1"),
      "sentence:s2": s("sentence", "s2"),
      "sentence:p1": s("sentence", "p1"),
      "sentence:orphan": s("sentence", "ghost"),
    };
    const result = aggregateDueByKey(
      states,
      NOW,
      new Set(["s1", "s2"]),
      new Set(["p1"]),
    );
    expect(result.sentence_vocab).toBe(2);
    expect(result.sentence_particle).toBe(1);
    // orphan with id in neither set is dropped.
    expect(result.sentence).toBeUndefined();
    expect(totalDue(result)).toBe(3);
  });
});

describe("totalDue", () => {
  it("sums all keys including the sentence_vocab/sentence_particle split", () => {
    expect(
      totalDue({ kanji: 4, sentence_vocab: 2, sentence_particle: 1, vocab: 0 }),
    ).toBe(7);
  });

  it("returns 0 for an empty map", () => {
    expect(totalDue({})).toBe(0);
  });
});
