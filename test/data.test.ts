import { describe, expect, test } from "vitest";
import {
  chooseDirection,
  generateChoices,
  generateGrammarQuizChoices,
  hashSeed,
} from "@/lib/data";
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

describe("hashSeed", () => {
  test("same (id, epoch) → same hash (deterministic)", () => {
    expect(hashSeed("e001", 0)).toBe(hashSeed("e001", 0));
    expect(hashSeed("e042", 7)).toBe(hashSeed("e042", 7));
  });

  test("different epoch → different hash (direction flips across epochs)", () => {
    expect(hashSeed("e001", 0)).not.toBe(hashSeed("e001", 1));
  });

  test("different id → different hash (cards vary independently)", () => {
    expect(hashSeed("e001", 0)).not.toBe(hashSeed("e002", 0));
  });

  test("returns non-negative integer", () => {
    for (let i = 0; i < 50; i++) {
      const h = hashSeed(`e${i.toString().padStart(3, "0")}`, i);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("chooseDirection", () => {
  test("box 1 always returns recognition (warm-up)", () => {
    for (let i = 0; i < 30; i++) {
      expect(chooseDirection(1, `e${i}`, 0)).toBe("recognition");
      expect(chooseDirection(1, `e${i}`, 42)).toBe("recognition");
    }
  });

  test("box 2+ returns ~80% recall over many cards", () => {
    let recall = 0;
    const N = 500;
    for (let i = 0; i < N; i++) {
      if (chooseDirection(3, `e${i}`, 0) === "recall") recall++;
    }
    // 80/20 target — allow ±7% window for 500-sample noise.
    expect(recall / N).toBeGreaterThan(0.73);
    expect(recall / N).toBeLessThan(0.87);
  });

  test("direction stable within same epoch (no mid-epoch flip)", () => {
    for (const box of [2, 3, 4, 5] as const) {
      const a = chooseDirection(box, "e001", 0);
      const b = chooseDirection(box, "e001", 0);
      expect(a).toBe(b);
    }
  });

  test("recognition is emitted at box ≥2 as well (not recall-only)", () => {
    let sawRecognition = false;
    for (let i = 0; i < 200; i++) {
      if (chooseDirection(3, `e${i}`, 0) === "recognition") {
        sawRecognition = true;
        break;
      }
    }
    expect(sawRecognition).toBe(true);
  });
});
