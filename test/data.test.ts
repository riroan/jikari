import { describe, expect, test } from "vitest";
import {
  chooseDirection,
  generateChoices,
  generateGrammarQuizChoices,
  generateKanjiChoices,
  hashSeed,
  kanaDistance,
  moraCount,
  readingShape,
} from "@/lib/data";
import type {
  GrammarPatternQuiz,
  KanjiCard,
  ParticleContrastQuiz,
} from "@/lib/types";
import { useCardsStore } from "@/lib/cards-store";

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

describe("moraCount", () => {
  test("拗音 counts as one mora with its base kana", () => {
    expect(moraCount("きょう")).toBe(2);
    expect(moraCount("しゃ")).toBe(1);
  });

  test("長音・撥音 each count as a mora", () => {
    expect(moraCount("こう")).toBe(2);
    expect(moraCount("かん")).toBe(2);
    expect(moraCount("し")).toBe(1);
  });
});

describe("kanaDistance", () => {
  test("the Korean-speaker confusion axes are all distance 1", () => {
    expect(kanaDistance("こう", "こく")).toBe(1); // 장음 / 촉음
    expect(kanaDistance("はい", "ばい")).toBe(1); // 청음 / 탁음
    expect(kanaDistance("しょ", "しょう")).toBe(1); // 요음 길이
    expect(kanaDistance("せい", "さい")).toBe(1); // 모음
  });

  test("unrelated readings are far apart", () => {
    expect(kanaDistance("さん", "りょく")).toBeGreaterThan(2);
  });

  test("identical is 0, symmetric", () => {
    expect(kanaDistance("がく", "がく")).toBe(0);
    expect(kanaDistance("あめ", "あまい")).toBe(kanaDistance("あまい", "あめ"));
  });
});

describe("readingShape", () => {
  test("buckets 전체형 훈독 by ending", () => {
    expect(readingShape("なく")).toBe("v");
    expect(readingShape("はしる")).toBe("v");
    expect(readingShape("およぐ")).toBe("v");
    expect(readingShape("わるい")).toBe("i");
    expect(readingShape("やま")).toBe("n");
    expect(readingShape("いと")).toBe("n");
  });

  test("consistency is what matters, not linguistic truth", () => {
    // 夜=よる is a noun but buckets as "v" — harmless, because its
    // distractors go through the same rule and also end in る.
    expect(readingShape("よる")).toBe(readingShape("はしる"));
  });
});

describe("generateKanjiChoices distractor quality", () => {
  const k = (
    id: string,
    onReadings: string[],
    kunReadings: string[],
  ): KanjiCard => ({
    id,
    kanji: id,
    onReadings,
    kunReadings,
    meanings: [],
    jlptLevel: 5,
    koreanHanja: id,
    koreanSound: [],
    koreanMeaning: "",
  });

  /**
   * 2모라 음독 20개 + 3모라 음독 20개. 정답은 2모라.
   * 덱이 선지 창(3 × 4 = 12)보다 넉넉해야 점수가 실제로 후보를 고른다 —
   * 풀이 창보다 얇으면 sampleScored는 의도대로 점수를 무시한다.
   */
  function seedDeck(extra: KanjiCard[] = []) {
    const twoMora = ["こう", "とう", "そう", "ほう", "ろう", "しん", "きん", "ぶん", "せん", "たん", "かん", "めい", "りん", "ざい", "はん", "ぎょ", "しゅ", "ばい", "のう", "ちく"];
    const threeMora = ["がくせい", "りょくとう", "しんぶん", "こうそく", "たいよう", "せいかつ", "でんわき", "じどうし", "きょうしつ", "ちゅうがく", "しゃかい", "びょういん", "けんきゅう", "ようふく", "せんせい", "とけいや", "ぎんこう", "こうえん", "しつもん", "べんきょう"];
    useCardsStore.setState({
      kanji: [
        k("的", ["てき"], ["まと"]),
        ...twoMora.map((r, i) => k(`a${i}`, [r], [])),
        ...threeMora.map((r, i) => k(`b${i}`, [r], [])),
        ...extra,
      ],
    });
  }

  test("prefers same-mora distractors over the 50/50 base rate", () => {
    seedDeck();
    const target = k("的", ["てき"], ["まと"]);
    let sameMora = 0;
    let total = 0;
    for (let seed = 0; seed < 50; seed++) {
      const { correct, choices } = generateKanjiChoices(target, "on", seed);
      for (const c of choices) {
        if (c === correct) continue;
        total++;
        if (moraCount(c) === moraCount(correct)) sameMora++;
      }
    }
    // Pool is half 2-mora, half 3-mora — uniform sampling would sit near 0.5.
    expect(sameMora / total).toBeGreaterThan(0.8);
  });

  test("never offers a reading the question kanji actually has", () => {
    // まと is 的's kun reading; plant it as another card's ON reading so the
    // on-quiz pool would pick it up if only onReadings were excluded.
    seedDeck([k("侵", ["まと"], [])]);
    const target = k("的", ["てき"], ["まと"]);
    for (let seed = 0; seed < 50; seed++) {
      expect(generateKanjiChoices(target, "on", seed).choices).not.toContain("まと");
    }
  });

  test("prefers same 품사 bucket for 훈독", () => {
    useCardsStore.setState({
      kanji: [
        k("泣", [], ["なく"]),
        ...["はしる", "およぐ", "はなす", "みる", "かう", "まなぶ", "たべる", "のむ", "かく", "よむ", "きく", "いく", "まつ", "たつ", "しぬ", "とぶ", "あそぶ", "つくる", "はこぶ", "うたう"].map((r, i) =>
          k(`v${i}`, [], [r]),
        ),
        ...["やま", "いと", "みず", "そら", "はな", "つき", "かわ", "うみ", "もり", "いし", "たけ", "くさ", "むし", "ゆき", "あめ", "かぜ", "ほし", "ゆめ", "いえ", "ふね"].map((r, i) =>
          k(`n${i}`, [], [r]),
        ),
      ],
    });
    const target = k("泣", [], ["なく"]);
    let verbs = 0;
    let total = 0;
    for (let seed = 0; seed < 50; seed++) {
      const { correct, choices } = generateKanjiChoices(target, "kun", seed);
      for (const c of choices) {
        if (c === correct) continue;
        total++;
        if (readingShape(c) === "v") verbs++;
      }
    }
    expect(verbs / total).toBeGreaterThan(0.8);
  });

  test("thin pool degrades gracefully instead of starving", () => {
    // Only two candidates exist and neither resembles the answer.
    useCardsStore.setState({
      kanji: [k("的", ["てき"], []), k("山", ["さん"], []), k("川", ["せん"], [])],
    });
    const { correct, choices } = generateKanjiChoices(k("的", ["てき"], []), "on", 3);
    expect(choices).toContain(correct);
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices).toHaveLength(3);
  });

  test("same seed is stable (SRS replay)", () => {
    seedDeck();
    const target = k("的", ["てき"], ["まと"]);
    expect(generateKanjiChoices(target, "on", 99).choices).toEqual(
      generateKanjiChoices(target, "on", 99).choices,
    );
  });
});
