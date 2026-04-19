import { describe, expect, test } from "vitest";
import { generateChoices, generateGrammarQuizChoices } from "@/lib/data";
import type {
  GrammarPatternQuiz,
  ParticleContrastQuiz,
} from "@/lib/types";

describe("generateChoices", () => {
  test("returns correct plus all distractors", () => {
    const result = generateChoices("A", ["B", "C", "D"], 42);
    expect(result.correct).toBe("A");
    expect(result.choices).toHaveLength(4);
    expect(new Set(result.choices)).toEqual(new Set(["A", "B", "C", "D"]));
  });

  test("same seed produces same order (stable for SRS replay)", () => {
    const a = generateChoices("X", ["Y", "Z"], 1234);
    const b = generateChoices("X", ["Y", "Z"], 1234);
    expect(a.choices).toEqual(b.choices);
  });

  test("different seeds usually produce different orders", () => {
    const orders = new Set<string>();
    for (let s = 0; s < 20; s++) {
      orders.add(generateChoices("A", ["B", "C", "D"], s).choices.join(","));
    }
    expect(orders.size).toBeGreaterThan(1);
  });

  test("empty distractors works", () => {
    const r = generateChoices("only", [], 0);
    expect(r.correct).toBe("only");
    expect(r.choices).toEqual(["only"]);
  });
});

describe("generateGrammarQuizChoices", () => {
  test("pattern quiz builds 4 choices", () => {
    const quiz: GrammarPatternQuiz = {
      sentence: "明日までに＿＿＿いけない",
      correct: "しなくては",
      distractors: ["するばかり", "しないでは", "できるほど"],
      translation: "내일까지 해야 해",
    };
    const r = generateGrammarQuizChoices(quiz, 7);
    expect(r.correct).toBe("しなくては");
    expect(r.choices).toHaveLength(4);
    expect(r.choices).toContain("しなくては");
  });

  test("particle contrast quiz builds 4 choices (correct + 3 borrowed)", () => {
    const quiz: ParticleContrastQuiz = {
      sentence: "私＿＿＿学生です",
      correct: "は",
      distractors: ["が", "に", "を"],
      translation: "저는 학생입니다",
    };
    const r = generateGrammarQuizChoices(quiz, 11);
    expect(r.correct).toBe("は");
    expect(r.choices).toHaveLength(4);
    expect(new Set(r.choices)).toEqual(new Set(["は", "が", "に", "を"]));
  });

  test("stable seed → stable choice order", () => {
    const quiz: ParticleContrastQuiz = {
      sentence: "雨＿＿＿降る",
      correct: "が",
      distractors: ["は", "を", "で"],
      translation: "비가 온다",
    };
    expect(generateGrammarQuizChoices(quiz, 99).choices).toEqual(
      generateGrammarQuizChoices(quiz, 99).choices,
    );
  });
});
