import { describe, it, expect } from "vitest";
import {
  DEFAULT_DIFFICULTY,
  INITIAL_RATING,
  RATING_MAX,
  RATING_MIN,
  difficultyOfJlpt,
  expectedScore,
  quantizeRating,
  ratingBand,
  updateRating,
} from "@/lib/rating";

describe("difficultyOfJlpt", () => {
  it("orders N5 (easiest) below N1 (hardest)", () => {
    const levels = [5, 4, 3, 2, 1] as const;
    const ds = levels.map(difficultyOfJlpt);
    for (let i = 1; i < ds.length; i++) {
      expect(ds[i]).toBeGreaterThan(ds[i - 1]);
    }
  });

  it("starts a new user at the easiest band", () => {
    expect(INITIAL_RATING).toBe(difficultyOfJlpt(5));
    expect(DEFAULT_DIFFICULTY).toBeGreaterThan(INITIAL_RATING);
  });
});

describe("expectedScore", () => {
  it("is a coin flip when rating equals difficulty", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
  });

  it("rises with rating and falls with difficulty", () => {
    expect(expectedScore(1800, 1500)).toBeGreaterThan(expectedScore(1500, 1500));
    expect(expectedScore(1500, 1800)).toBeLessThan(expectedScore(1500, 1500));
  });

  it("stays a probability across the whole scale", () => {
    for (const r of [RATING_MIN, 1000, 1500, RATING_MAX]) {
      for (const d of [1000, 1500, 2000]) {
        const e = expectedScore(r, d);
        expect(e).toBeGreaterThan(0);
        expect(e).toBeLessThan(1);
      }
    }
  });
});

describe("updateRating", () => {
  it("moves up on correct, down on wrong", () => {
    expect(updateRating(1500, 1500, true)).toBeGreaterThan(1500);
    expect(updateRating(1500, 1500, false)).toBeLessThan(1500);
  });

  it("rewards an upset more than an expected win", () => {
    const upset = updateRating(1000, 2000, true) - 1000;
    const gimme = updateRating(2000, 1000, true) - 2000;
    expect(upset).toBeGreaterThan(gimme);
  });

  it("punishes losing to an easy item more than losing to a hard one", () => {
    const easyLoss = 1500 - updateRating(1500, 1000, false);
    const hardLoss = 1500 - updateRating(1500, 2000, false);
    expect(easyLoss).toBeGreaterThan(hardLoss);
  });

  it("clamps to [RATING_MIN, RATING_MAX]", () => {
    let low = INITIAL_RATING;
    let high = INITIAL_RATING;
    for (let i = 0; i < 500; i++) {
      low = updateRating(low, 2000, false);
      high = updateRating(high, 1000, true);
    }
    expect(low).toBeGreaterThanOrEqual(RATING_MIN);
    expect(high).toBeLessThanOrEqual(RATING_MAX);
  });

  it("converges on a simulated learner's true skill", () => {
    // Learner clears anything at or below 1500 and fails everything above.
    const TRUE_SKILL = 1500;
    const pool = [1000, 1250, 1500, 1750, 2000];
    let rating = INITIAL_RATING;
    for (let i = 0; i < 400; i++) {
      const d = pool[i % pool.length];
      rating = updateRating(rating, d, d <= TRUE_SKILL);
    }
    // Wide band: Elo oscillates around the fixed point, it doesn't land on it.
    expect(rating).toBeGreaterThan(TRUE_SKILL - 250);
    expect(rating).toBeLessThan(TRUE_SKILL + 250);
    expect(rating).toBeGreaterThan(INITIAL_RATING);
  });
});

describe("ratingBand", () => {
  it("labels each band's own difficulty with that band", () => {
    for (const level of [5, 4, 3, 2, 1] as const) {
      expect(ratingBand(difficultyOfJlpt(level))).toBe(level);
    }
  });

  it("snaps to the nearest band in between", () => {
    expect(ratingBand(1100)).toBe(5); // closer to 1000 than 1250
    expect(ratingBand(1200)).toBe(4); // closer to 1250
  });

  it("never falls off either end of the scale", () => {
    expect(ratingBand(RATING_MIN)).toBe(5);
    expect(ratingBand(RATING_MAX)).toBe(1);
  });
});

describe("quantizeRating", () => {
  it("rounds to a 50-point step", () => {
    expect(quantizeRating(1000)).toBe(1000);
    expect(quantizeRating(1024)).toBe(1000);
    expect(quantizeRating(1026)).toBe(1050);
  });

  it("stays inside the deck's band width, so selection is unaffected", () => {
    for (const r of [1013, 1247, 1499, 1751, 1999]) {
      expect(Math.abs(quantizeRating(r) - r)).toBeLessThanOrEqual(25);
    }
  });
});
