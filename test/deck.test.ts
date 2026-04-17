import { describe, it, expect } from "vitest";
import { shuffleIds } from "@/lib/deck";

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
