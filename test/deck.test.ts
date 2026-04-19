import { describe, it, expect } from "vitest";
import { shuffleIds, weightedShuffleIds } from "@/lib/deck";

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
