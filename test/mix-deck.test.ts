import { describe, it, expect } from "vitest";
import { buildMixDeck, weakWeight, type MixSubject } from "@/lib/mix-deck";
import type { LearningState } from "@/lib/types";

const ids = (p: string, n: number) => Array.from({ length: n }, (_, i) => `${p}${i}`);
const pools = { kanji: ids("k", 30), vocab: ids("v", 30), grammar: ids("g", 30), particle: ids("p", 2) };
const base = { pools, subjects: ["kanji", "vocab", "grammar", "particle"] as MixSubject[], length: 20, seed: 7 };

describe("buildMixDeck", () => {
  it("honours length and subject filter, no duplicates", () => {
    const d = buildMixDeck({ ...base, subjects: ["kanji", "vocab"] });
    expect(d).toHaveLength(20);
    expect(new Set(d.map((x) => x.subject))).toEqual(new Set(["kanji", "vocab"]));
    expect(new Set(d.map((x) => x.subject + x.id)).size).toBe(20);
  });
  it("never repeats a subject back-to-back when avoidable", () => {
    for (let seed = 0; seed < 30; seed++) {
      const d = buildMixDeck({ ...base, seed });
      for (let i = 1; i < d.length; i++) expect(d[i].subject).not.toBe(d[i - 1].subject);
    }
  });
  it("splits evenly; small pools give the rest to others", () => {
    const d = buildMixDeck(base);
    const n = (s: string) => d.filter((x) => x.subject === s).length;
    expect(n("particle")).toBe(2);
    expect(n("kanji") + n("vocab") + n("grammar")).toBe(18);
    expect(Math.max(n("kanji"), n("vocab"), n("grammar"))).toBeLessThanOrEqual(6);
  });
  it("skips empty/missing subjects and caps at available cards", () => {
    const d = buildMixDeck({ pools: { kanji: ["a", "b"], vocab: [] }, subjects: ["kanji", "vocab", "expression"], length: 10, seed: 1 });
    expect(d.map((x) => x.id).sort()).toEqual(["a", "b"]);
    expect(buildMixDeck({ pools: {}, subjects: ["kanji"], length: 10, seed: 1 })).toEqual([]);
  });
  it("is deterministic per seed", () => {
    expect(buildMixDeck(base)).toEqual(buildMixDeck(base));
    expect(buildMixDeck(base)).not.toEqual(buildMixDeck({ ...base, seed: 8 }));
  });
  it("weak-first prefers heavy cards", () => {
    const p = { kanji: ids("k", 100) };
    const weight = (_: MixSubject, id: string) => (Number(id.slice(1)) < 10 ? 50 : 1);
    let weak = 0;
    for (let seed = 0; seed < 20; seed++) {
      weak += buildMixDeck({ pools: p, subjects: ["kanji"], length: 10, seed, weight }).filter((x) => Number(x.id.slice(1)) < 10).length;
    }
    expect(weak / 20).toBeGreaterThan(6);
    // uniform: ~1 of 10 expected
    let uni = 0;
    for (let seed = 0; seed < 20; seed++) {
      uni += buildMixDeck({ pools: p, subjects: ["kanji"], length: 10, seed }).filter((x) => Number(x.id.slice(1)) < 10).length;
    }
    expect(uni / 20).toBeLessThan(3);
  });
});

describe("weakWeight", () => {
  const st = (box: 1 | 2 | 3 | 4 | 5, correctStreak: number, lastReviewed = 1) =>
    ({ box, correctStreak, lastReviewed }) as LearningState;
  it("ranks never-seen > recently wrong > low box > high box", () => {
    expect(weakWeight(undefined)).toBeGreaterThan(weakWeight(st(1, 0)));
    expect(weakWeight(st(3, 0))).toBeGreaterThan(weakWeight(st(3, 2)));
    expect(weakWeight(st(1, 1))).toBeGreaterThan(weakWeight(st(5, 4)));
    expect(weakWeight(st(1, 0, 0))).toBe(weakWeight(undefined));
  });
});

describe("buildMixDeck duplicate ids", () => {
  it("never emits the same entry twice", () => {
    const deck = buildMixDeck({ pools: { kanji: ["a", "a", "b"] }, subjects: ["kanji"], length: 10, seed: 1 });
    expect(deck.map((d) => d.id).sort()).toEqual(["a", "b"]);
  });
});
