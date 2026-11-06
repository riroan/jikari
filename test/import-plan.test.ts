import { describe, expect, test } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import { duplicateImportIds, importPlan } from "../scripts/import-plan";

describe("importPlan", () => {
  test("routes each seed to its add-* script, card tables before nothing else", () => {
    const plan = importPlan(
      ["vocab-b.json", "kanji-a.json", "particles-x.json", "sentences-y.json", "expressions-z.json", "README.md"],
      ["grammar-n5-n4.json", "grammar-seed-sample.json", "chapters.config.ts", "seeds"],
    );
    expect(plan.map((s) => `${s.script.replace("scripts/", "")} ${s.file}`)).toEqual([
      "add-kanji.ts data/seeds/kanji-a.json",
      "add-vocab.ts data/seeds/vocab-b.json",
      "add-sentence.ts data/seeds/particles-x.json",
      "add-sentence.ts data/seeds/sentences-y.json",
      "add-expression.ts data/seeds/expressions-z.json",
      "add-grammar.ts data/grammar-n5-n4.json",
      "add-grammar.ts data/grammar-seed-sample.json",
    ]);
  });

  test("every real seed file is covered by some step", () => {
    const seeds = readdirSync(path.join(process.cwd(), "data/seeds")).filter((f) => f.endsWith(".json"));
    const data = readdirSync(path.join(process.cwd(), "data"));
    const covered = new Set(importPlan(seeds, data).map((s) => s.file));
    expect(seeds.filter((f) => !covered.has(`data/seeds/${f}`))).toEqual([]);
  });

  test("detects duplicate IDs within a table before importing", () => {
    const steps = importPlan(["kanji-a.json", "kanji-b.json", "vocab-a.json"], []);
    const ids: Record<string, string[]> = {
      "data/seeds/kanji-a.json": ["日", "日"],
      "data/seeds/kanji-b.json": ["日"],
      "data/seeds/vocab-a.json": ["日"],
    };
    expect(duplicateImportIds(steps, (file) => ids[file])).toEqual([
      "日: data/seeds/kanji-a.json, data/seeds/kanji-a.json",
      "日: data/seeds/kanji-a.json, data/seeds/kanji-b.json",
    ]);
  });
});
