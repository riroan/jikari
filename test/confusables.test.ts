import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CONFUSABLES, confusableFor } from "@/lib/confusables";
import { PARTICLE_INFO } from "@/lib/particle-info";

const grammarIds = new Set<string>(
  ["grammar-n5-n4", "grammar-daily-batch1", "grammar-seed-sample"].flatMap((f) =>
    (JSON.parse(readFileSync(`data/${f}.json`, "utf8")) as { id: string }[]).map((c) => c.id),
  ),
);
// Hand-checked 常用漢字 (no joyo table ships with the repo). Adding a kanji to an
// example means confirming it is in the 2,136 list and adding it here.
const allowedKanji = new Set(
  "日本行金春花時間来駅着電話道近前歯後食薬子買物音楽歩見月国帰友会予定議三思雨田中店人気手伝休写真学校窓九五起入生公園犬天安事",
);
const KANJI = /[一-鿿]/g;

describe("CONFUSABLES", () => {
  it("has 20-30 pairs", () => {
    expect(CONFUSABLES.length).toBeGreaterThanOrEqual(20);
    expect(CONFUSABLES.length).toBeLessThanOrEqual(30);
  });

  it("refs exist, never self-pair, sides are non-empty", () => {
    for (const { kind, a, b } of CONFUSABLES) {
      expect(a.ref).not.toBe(b.ref);
      for (const s of [a, b]) {
        if (kind === "grammar") expect(grammarIds.has(s.ref), s.ref).toBe(true);
        else expect(PARTICLE_INFO[s.ref], s.ref).toBeDefined();
        for (const v of [s.label, s.diff, s.jp, s.ko]) expect(v.trim()).not.toBe("");
        expect(s.jp).toMatch(/\[\[.+\]\]/);
      }
    }
  });

  it("no duplicate pairs and every pair is reachable from some card", () => {
    const seen = new Set<string>();
    for (const { kind, a, b } of CONFUSABLES) {
      const key = [kind, ...[a.ref, b.ref].sort()].join("|");
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      const reach = [a.ref, b.ref].some((r) => confusableFor(kind, r)?.other.ref === (r === a.ref ? b.ref : a.ref));
      expect(reach, key).toBe(true);
    }
  });

  it("all kanji stay inside the taught 常用漢字", () => {
    for (const { a, b } of CONFUSABLES) {
      for (const s of [a, b]) {
        for (const ch of (s.jp + s.label).match(KANJI) ?? []) {
          expect(allowedKanji.has(ch), `${ch} in ${s.jp}`).toBe(true);
        }
      }
    }
  });

  it("confusableFor orients own side first and returns null when absent", () => {
    expect(confusableFor("grammar", "pattern-youni")?.self.ref).toBe("pattern-youni");
    expect(confusableFor("grammar", "pattern-nope")).toBeNull();
  });
});
