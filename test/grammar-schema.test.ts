import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  grammarCardSchema,
  parseGrammarCardArray,
} from "@/lib/grammar-schema";

describe("grammarCardSchema", () => {
  test("accepts a well-formed pattern card", () => {
    const card = {
      id: "pattern-test",
      type: "pattern",
      jlptLevel: 4,
      pattern: "〜テスト",
      koreanStructure: "〜테스트",
      meaningKo: "테스트 문형",
      examples: [
        { jp: "A", ko: "a" },
        { jp: "B", ko: "b" },
        { jp: "C", ko: "c" },
      ],
      quizzes: [
        { sentence: "＿＿＿です", correct: "A", distractors: ["B", "C", "D"], translation: "a" },
        { sentence: "＿＿＿でした", correct: "B", distractors: ["A", "C", "D"], translation: "b" },
        { sentence: "＿＿＿だった", correct: "C", distractors: ["A", "B", "D"], translation: "c" },
      ],
    };
    expect(() => grammarCardSchema.parse(card)).not.toThrow();
  });

  test("rejects pattern card with wrong example count", () => {
    const card = {
      id: "pattern-wrong",
      type: "pattern",
      jlptLevel: 4,
      pattern: "x",
      koreanStructure: "x",
      meaningKo: "x",
      examples: [{ jp: "A", ko: "a" }],
      quizzes: [
        { sentence: "＿＿＿", correct: "A", distractors: ["B", "C", "D"], translation: "a" },
        { sentence: "＿＿＿", correct: "B", distractors: ["A", "C", "D"], translation: "b" },
        { sentence: "＿＿＿", correct: "C", distractors: ["A", "B", "D"], translation: "c" },
      ],
    };
    expect(() => grammarCardSchema.parse(card)).toThrow();
  });

  test("rejects pattern quiz sentence without ＿＿＿ blank", () => {
    const card = {
      id: "pattern-noblank",
      type: "pattern",
      jlptLevel: 4,
      pattern: "x",
      koreanStructure: "x",
      meaningKo: "x",
      examples: [
        { jp: "A", ko: "a" },
        { jp: "B", ko: "b" },
        { jp: "C", ko: "c" },
      ],
      quizzes: [
        { sentence: "no blank here", correct: "A", distractors: ["B", "C", "D"], translation: "a" },
        { sentence: "＿＿＿", correct: "B", distractors: ["A", "C", "D"], translation: "b" },
        { sentence: "＿＿＿", correct: "C", distractors: ["A", "B", "D"], translation: "c" },
      ],
    };
    expect(() => grammarCardSchema.parse(card)).toThrow();
  });

  test("rejects particle card with unbalanced examples (not 2-per-particle)", () => {
    const card = {
      id: "particle-wa-ga",
      type: "particle_contrast",
      jlptLevel: 5,
      particles: ["は", "が"],
      rule: "...",
      examples: [
        { particle: "は", jp: "A", ko: "a" },
        { particle: "は", jp: "B", ko: "b" },
        { particle: "は", jp: "C", ko: "c" },  // 3 for は, 1 for が — wrong
        { particle: "が", jp: "D", ko: "d" },
      ],
      quizzes: [
        { sentence: "＿＿＿", correct: "は", distractors: ["が", "に", "を"], translation: "..." },
        { sentence: "＿＿＿", correct: "が", distractors: ["は", "に", "を"], translation: "..." },
        { sentence: "＿＿＿", correct: "は", distractors: ["が", "に", "を"], translation: "..." },
      ],
    };
    expect(() => grammarCardSchema.parse(card)).toThrow(/exactly 2 examples/);
  });

  test("rejects particle quiz with correct not in particles pair", () => {
    const card = {
      id: "particle-wa-ga",
      type: "particle_contrast",
      jlptLevel: 5,
      particles: ["は", "が"],
      rule: "...",
      examples: [
        { particle: "は", jp: "A", ko: "a" },
        { particle: "は", jp: "B", ko: "b" },
        { particle: "が", jp: "C", ko: "c" },
        { particle: "が", jp: "D", ko: "d" },
      ],
      quizzes: [
        { sentence: "＿＿＿", correct: "に", distractors: ["は", "が", "を"], translation: "..." },
        { sentence: "＿＿＿", correct: "は", distractors: ["が", "に", "を"], translation: "..." },
        { sentence: "＿＿＿", correct: "が", distractors: ["は", "に", "を"], translation: "..." },
      ],
    };
    expect(() => grammarCardSchema.parse(card)).toThrow(/one of the two particles/);
  });

  test("rejects id not matching pattern/particle prefix", () => {
    const card = {
      id: "wrong-prefix",
      type: "pattern",
      jlptLevel: 4,
      pattern: "x",
      koreanStructure: "x",
      meaningKo: "x",
      examples: [
        { jp: "A", ko: "a" },
        { jp: "B", ko: "b" },
        { jp: "C", ko: "c" },
      ],
      quizzes: [
        { sentence: "＿＿＿", correct: "A", distractors: ["B", "C", "D"], translation: "a" },
        { sentence: "＿＿＿", correct: "B", distractors: ["A", "C", "D"], translation: "b" },
        { sentence: "＿＿＿", correct: "C", distractors: ["A", "B", "D"], translation: "c" },
      ],
    };
    expect(() => grammarCardSchema.parse(card)).toThrow(/pattern-/);
  });
});

describe("sample fixture", () => {
  test("data/grammar-seed-sample.json passes full schema", () => {
    const raw = readFileSync(
      path.resolve(__dirname, "..", "data", "grammar-seed-sample.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw);
    const cards = parseGrammarCardArray(parsed);
    expect(cards).toHaveLength(3);
    expect(cards.filter((c) => c.type === "pattern")).toHaveLength(2);
    expect(cards.filter((c) => c.type === "particle_contrast")).toHaveLength(1);
  });
});
