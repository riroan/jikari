import { describe, it, expect } from "vitest";
import { CHAPTERS } from "@/data/chapters.config";

describe("CHAPTERS — schema sanity", () => {
  it("every chapter has a non-empty id and name", () => {
    for (const c of CHAPTERS) {
      expect(c.id, `chapter without id: ${JSON.stringify(c)}`).toBeTruthy();
      expect(c.name, `chapter ${c.id} has empty name`).toBeTruthy();
    }
  });

  it("ids are unique (DB seed key)", () => {
    const ids = CHAPTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sortOrder values are unique (no ambiguous chapter list ordering)", () => {
    const orders = CHAPTERS.map((c) => c.sortOrder);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("intro is either null or a non-trivial string (≥10 chars when present)", () => {
    for (const c of CHAPTERS) {
      if (c.intro === null) continue;
      expect(c.intro.length, `chapter ${c.id} intro too short`).toBeGreaterThanOrEqual(10);
    }
  });

  it("every chapter has at least one match rule", () => {
    for (const c of CHAPTERS) {
      const rule = c.match;
      const total =
        (rule.keywords?.length ?? 0) +
        (rule.vocabWords?.length ?? 0) +
        (rule.kanji?.length ?? 0) +
        (rule.sentenceIds?.length ?? 0) +
        (rule.particles?.length ?? 0) +
        (rule.grammarIds?.length ?? 0);
      expect(total, `chapter ${c.id} has no match rules — won't pull cards`).toBeGreaterThan(0);
    }
  });
});

describe("CHAPTERS — content review", () => {
  it("all chapters now have an intro filled in (Cycle 1 follow-up)", () => {
    const missing = CHAPTERS.filter((c) => c.intro === null).map((c) => c.id);
    expect(missing, `chapters still missing intro: ${missing.join(", ")}`).toHaveLength(0);
  });
});
