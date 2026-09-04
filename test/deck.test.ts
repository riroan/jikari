import { describe, it, expect } from "vitest";
import { pickByDifficulty, shuffleIds, weightedShuffleIds } from "@/lib/deck";
import {
  ALL_CONJUGATION_FORMS,
} from "@/lib/types";
import { conjugationFormDifficulty, INITIAL_RATING } from "@/lib/rating";

describe("shuffleIds", () => {
  it("returns all original ids", () => {
    const input = [1, 2, 3, 4, 5];
    const shuffled = shuffleIds(input, 42);
    expect(shuffled.slice().sort()).toEqual(input.slice().sort());
    expect(shuffled).toHaveLength(5);
  });

  it("is deterministic for the same seed", () => {
    const input = ["a", "b", "c", "d", "e"];
    expect(shuffleIds(input, 100)).toEqual(shuffleIds(input, 100));
  });

  it("produces different orderings for different seeds", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = shuffleIds(input, 1);
    const b = shuffleIds(input, 99999);
    expect(a).not.toEqual(b);
  });

  it("does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const original = input.slice();
    shuffleIds(input, 7);
    expect(input).toEqual(original);
  });

  it("handles empty arrays", () => {
    expect(shuffleIds([], 1)).toEqual([]);
  });

  it("handles single-element arrays", () => {
    expect(shuffleIds([42], 1)).toEqual([42]);
  });
});

describe("weightedShuffleIds", () => {
  const ids = Array.from({ length: 200 }, (_, i) => `card_${i}`);
  const allBox1 = () => 1 as const;
  const allBox5 = () => 5 as const;

  it("keeps every id when all cards are at box 1", () => {
    const result = weightedShuffleIds(ids, allBox1, 42);
    expect(result.slice().sort()).toEqual(ids.slice().sort());
  });

  it("drops most ids when all cards are at box 5 (~1/14 kept)", () => {
    const result = weightedShuffleIds(ids, allBox5, 42);
    // Target is 200/14 ≈ 14. Hash isn't perfectly uniform so allow wide band,
    // but we definitely shouldn't keep everything.
    expect(result.length).toBeLessThan(ids.length / 2);
    expect(result.length).toBeGreaterThan(0);
  });

  it("is deterministic given the same inputs and seed", () => {
    const mixed = (id: string): 1 | 2 | 3 | 4 | 5 =>
      ((id.charCodeAt(id.length - 1) % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    expect(weightedShuffleIds(ids, mixed, 123)).toEqual(
      weightedShuffleIds(ids, mixed, 123),
    );
  });

  it("falls back to the full shuffled deck when nothing survives filtering", () => {
    // One id, at box 5 — some seeds will reject it. Fallback must still yield it.
    const single = ["lonely"];
    for (let seed = 0; seed < 20; seed++) {
      const out = weightedShuffleIds(single, () => 5, seed);
      expect(out).toEqual(["lonely"]);
    }
  });

  it("shifts the sampled set across different seeds", () => {
    const a = weightedShuffleIds(ids, allBox5, 1);
    const b = weightedShuffleIds(ids, allBox5, 99999);
    expect(new Set(a)).not.toEqual(new Set(b));
  });
});

describe("weightedShuffleIds — difficulty weighting", () => {
  // 500 cards spread evenly across the five JLPT bands, all at box 1 so the
  // SRS factor is a constant 1 and only the difficulty weight varies.
  const BANDS = [1000, 1250, 1500, 1750, 2000];
  const ids = Array.from({ length: 500 }, (_, i) => `card_${i}`);
  const difficultyOf = (id: string) => BANDS[Number(id.slice(5)) % BANDS.length];
  const allBox1 = () => 1 as const;

  const bandCounts = (rating: number, seed = 7) => {
    const kept = weightedShuffleIds(ids, allBox1, seed, { difficultyOf, rating });
    const counts = new Map<number, number>(BANDS.map((b) => [b, 0]));
    for (const id of kept) {
      const d = difficultyOf(id);
      counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return counts;
  };

  it("serves mostly N5 to a beginner", () => {
    const c = bandCounts(1000);
    expect(c.get(1000)!).toBeGreaterThan(c.get(1250)!);
    expect(c.get(1250)!).toBeGreaterThan(c.get(1500)!);
    expect(c.get(1500)!).toBeGreaterThan(c.get(2000)!);
  });

  it("shifts the peak upward as the rating climbs", () => {
    const beginner = bandCounts(1000);
    const advanced = bandCounts(1750);
    // The hard end grows and the easy end shrinks — that is the whole feature.
    expect(advanced.get(1750)!).toBeGreaterThan(beginner.get(1750)!);
    expect(advanced.get(1000)!).toBeLessThan(beginner.get(1000)!);
    expect(advanced.get(1750)!).toBeGreaterThan(advanced.get(1000)!);
  });

  it("never locks a band out entirely — fat tails on purpose", () => {
    // A beginner should still meet the occasional N1 item.
    expect(bandCounts(1000).get(2000)!).toBeGreaterThan(0);
  });

  it("is deterministic given the same rating and seed", () => {
    const a = weightedShuffleIds(ids, allBox1, 99, { difficultyOf, rating: 1400 });
    const b = weightedShuffleIds(ids, allBox1, 99, { difficultyOf, rating: 1400 });
    expect(a).toEqual(b);
  });

  it("leaves the box-only behaviour untouched when no weighting is passed", () => {
    const withoutWeighting = weightedShuffleIds(ids, allBox1, 42);
    expect(withoutWeighting.slice().sort()).toEqual(ids.slice().sort());
  });

  it("still falls back rather than serving an empty deck", () => {
    // One wildly-out-of-band card: its weight is tiny, but a deck must exist.
    const lonely = ["card_0"];
    for (let seed = 0; seed < 20; seed++) {
      const out = weightedShuffleIds(lonely, () => 5, seed, {
        difficultyOf: () => 2000,
        rating: 800,
      });
      expect(out).toEqual(["card_0"]);
    }
  });
});

describe("pickByDifficulty", () => {
  const pickForms = (rating: number, n = 300) =>
    Array.from({ length: n }, (_, seed) =>
      pickByDifficulty(
        ALL_CONJUGATION_FORMS,
        conjugationFormDifficulty,
        rating,
        seed * 977,
      ),
    );

  const share = (forms: string[], of: readonly string[]) =>
    forms.filter((f) => of.includes(f)).length / forms.length;

  const BASIC = ["masu", "te", "ta", "nai"];
  const HARD = ["imperative", "passive", "causative"];

  it("serves mostly basic forms at the beginner rating", () => {
    const forms = pickForms(INITIAL_RATING);
    // 10개 중 4개가 기본형 — 균등 추첨이면 0.4에 앉는다.
    expect(share(forms, BASIC)).toBeGreaterThan(0.6);
    expect(share(forms, HARD)).toBeLessThan(0.15);
  });

  it("shifts to advanced forms as the rating climbs", () => {
    const beginner = share(pickForms(INITIAL_RATING), HARD);
    const advanced = share(pickForms(1700), HARD);
    expect(advanced).toBeGreaterThan(beginner * 2);
  });

  it("never locks a form out entirely (fat tails, not a gate)", () => {
    const forms = pickForms(INITIAL_RATING, 600);
    for (const hard of HARD) expect(forms).toContain(hard);
    const top = pickForms(2000, 600);
    for (const basic of BASIC) expect(top).toContain(basic);
  });

  it("is deterministic for the same seed", () => {
    const args = [ALL_CONJUGATION_FORMS, conjugationFormDifficulty, 1200, 4242] as const;
    expect(pickByDifficulty(...args)).toBe(pickByDifficulty(...args));
  });

  it("returns the only item when there is nothing to choose from", () => {
    expect(pickByDifficulty(["masu"] as const, () => 1000, 2000, 5)).toBe("masu");
  });
});
