import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { validate as validateExpression } from "../scripts/add-expression";
import { parseMarkup, stripMarkup } from "@/lib/jp-markup";
import { parseGrammarCardArray } from "@/lib/grammar-schema";
import { conjugate } from "@/lib/conjugation";
import { conjugateAdj } from "@/lib/adjective";
import { ALL_CONJUGATION_FORMS } from "@/lib/types";
import {
  centerTell,
  chooseDirection,
  generateChoices,
  generateExpressionChoices,
  generateGrammarQuizChoices,
  generateKanjiChoices,
  generateVocabChoices,
  hashSeed,
  kanaDistance,
  moraCount,
  readingShape,
} from "@/lib/data";
import type {
  ExpressionCard,
  GrammarPatternQuiz,
  KanjiCard,
  ParticleContrastQuiz,
  VocabCard,
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

describe("generateExpressionChoices distractor quality", () => {
  const e = (id: string, register: ExpressionCard["register"]): ExpressionCard => ({
    id,
    situation_ko: `상황 ${id}`,
    expression_jp: `表現${id}`,
    register,
    translation_ko: `뜻 ${id}`,
  });

  function seedDeck() {
    // 반말 20장, 존댓말 20장 — 선지 창(3 × 4 = 12)보다 각 버킷이 넉넉해야 한다.
    useCardsStore.setState({
      expressions: [
        ...Array.from({ length: 20 }, (_, i) => e(`c${i}`, "casual")),
        ...Array.from({ length: 20 }, (_, i) => e(`p${i}`, "polite")),
      ],
    });
  }

  test.each(["recall", "recognition"] as const)(
    "%s 선지는 같은 register에서 나온다",
    (direction) => {
      seedDeck();
      const target = e("p0", "polite");
      let same = 0;
      let total = 0;
      for (let seed = 0; seed < 50; seed++) {
        const { correct, choices } = generateExpressionChoices(target, direction, seed);
        for (const c of choices) {
          if (c === correct) continue;
          total++;
          if (/p\d+/.test(c)) same++;
        }
      }
      // 덱의 절반만 같은 register — 무작위면 0.5 언저리.
      expect(same / total).toBeGreaterThan(0.8);
    },
  );

  test("카드가 적은 덱에서도 선지가 굶지 않는다", () => {
    useCardsStore.setState({ expressions: [e("a", "polite"), e("b", "casual"), e("c", "casual")] });
    const { correct, choices } = generateExpressionChoices(e("a", "polite"), "recall", 3);
    expect(choices).toContain(correct);
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices).toHaveLength(3);
  });
});

describe("centerTell", () => {
  test("정답이 유일한 중심이면 1", () => {
    expect(centerTell("がく", ["かく", "がい", "はく"])).toBe(1);
  });
  test("중심이 아니면 0", () => {
    expect(centerTell("がく", ["かく", "かい", "かん"])).toBe(0);
  });
  test("공동 중심이면 1/공동 수", () => {
    // ab/ac/bb/bc 넷 다 거리 합 4 — 네 선지가 공동 중심.
    expect(centerTell("ab", ["ac", "bb", "bc"])).toBeCloseTo(0.25);
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

  test("정답이 선지 무리의 한가운데에 놓이지 않는다", () => {
    // 정답의 이웃(편집거리 1)이 넉넉한 덱 — 예전에는 이웃 3개가 그대로 뽑혀
    // "나머지와 가장 닮은 선지"를 고르면 판독 없이 맞힐 수 있었다.
    const neighbors = ["かく", "がい", "はく", "がん", "とく", "ろく", "がつ", "まく", "かい", "さく", "がき", "ばく"];
    useCardsStore.setState({
      kanji: [k("学", ["がく"], []), ...neighbors.map((r, i) => k(`n${i}`, [r], []))],
    });
    const target = k("学", ["がく"], []);
    let tell = 0;
    const N = 60;
    for (let seed = 0; seed < N; seed++) {
      const { correct, choices } = generateKanjiChoices(target, "on", seed);
      tell += centerTell(correct, choices.filter((c) => c !== correct));
    }
    // 우연히 고르면 0.25. 중심 고르기가 그보다 확연히 유리하면 안 된다.
    expect(tell / N).toBeLessThan(0.35);
  });

  test("same seed is stable (SRS replay)", () => {
    seedDeck();
    const target = k("的", ["てき"], ["まと"]);
    expect(generateKanjiChoices(target, "on", 99).choices).toEqual(
      generateKanjiChoices(target, "on", 99).choices,
    );
  });
});

describe("generateVocabChoices distractor quality", () => {
  const v = (
    word: string,
    korean: string,
    verbGroup: VocabCard["verbGroup"] = "not_verb",
    adjGroup: VocabCard["adjGroup"] = "not_adj",
  ): VocabCard => ({
    id: word,
    word,
    reading: word,
    meanings: [],
    koreanMeanings: [korean],
    jlptLevel: 5,
    verbGroup,
    adjGroup,
  });

  /** 명사·동사·형용사 각 12장. 선지 창(3 × 4 = 12)보다 버킷이 넉넉해야 한다. */
  const NOUNS = ["집", "방", "차", "밥", "물", "책", "역", "산", "강", "밤", "빵", "꽃"];

  function seedDeck() {
    const verbs = ["먹다", "마시다", "가다", "오다", "보다", "듣다", "쓰다", "읽다", "자다", "사다", "팔다", "걷다"];
    const adjs = ["춥다", "덥다", "크다", "작다", "높다", "싸다", "밝다", "어둡다", "새롭다", "낡다", "많다", "적다"];
    useCardsStore.setState({
      vocab: [
        v("犬", "개"),
        ...NOUNS.map((m, i) => v(`n${i}`, m)),
        ...verbs.map((m, i) => v(`v${i}`, m, "godan")),
        ...adjs.map((m, i) => v(`a${i}`, m, "not_verb", "i_adj")),
      ],
    });
  }

  test("recognition 뜻 선지도 같은 품사에서 나온다", () => {
    seedDeck();
    const target = v("犬", "개");
    const nouns = new Set(NOUNS);
    let samePos = 0;
    let total = 0;
    for (let seed = 0; seed < 50; seed++) {
      const { correct, choices } = generateVocabChoices(target, "recognition", seed);
      for (const c of choices) {
        if (c === correct) continue;
        total++;
        if (nouns.has(c)) samePos++;
      }
    }
    // 덱의 1/3만 명사 — 무작위면 0.33 언저리에 앉는다.
    expect(samePos / total).toBeGreaterThan(0.8);
  });

  test("정답 카드의 다른 뜻은 선지로 나오지 않는다", () => {
    seedDeck();
    const target: VocabCard = { ...v("車", "자동차"), koreanMeanings: ["자동차", "차"] };
    useCardsStore.setState({ vocab: [target, ...useCardsStore.getState().vocab] });
    for (let seed = 0; seed < 30; seed++) {
      expect(generateVocabChoices(target, "recognition", seed).choices).not.toContain("차");
    }
  });

  test("뜻을 공유하는 다른 단어는 선지로 나오지 않는다 (정답이 둘이 되는 것 방지)", () => {
    seedDeck();
    const wakaru: VocabCard = { ...v("分かる", "알다", "godan"), koreanMeanings: ["알다", "이해하다"] };
    const shiru = v("知る", "알다", "godan");
    useCardsStore.setState({ vocab: [wakaru, shiru, ...useCardsStore.getState().vocab] });
    for (let seed = 0; seed < 40; seed++) {
      expect(generateVocabChoices(shiru, "recall", seed).choices).not.toContain("分かる");
      expect(generateVocabChoices(wakaru, "recall", seed).choices).not.toContain("知る");
      expect(generateVocabChoices(shiru, "recognition", seed).choices).not.toContain("이해하다");
    }
  });

  test("얇은 덱에서도 선지가 굶지 않는다", () => {
    useCardsStore.setState({ vocab: [v("犬", "개"), v("猫", "고양이"), v("鳥", "새")] });
    const { correct, choices } = generateVocabChoices(v("犬", "개"), "recognition", 3);
    expect(choices).toContain(correct);
    expect(new Set(choices).size).toBe(choices.length);
    expect(choices).toHaveLength(3);
  });
});

describe("seed files", () => {
  const dir = path.join(process.cwd(), "data/seeds");
  const ids = (prefix: string) =>
    readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
      .flatMap((f) =>
        (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as { id: string }[]).map(
          (c) => `${c.id}  (${f})`,
        ),
      );

  // add-*.ts는 이미 있는 id를 건너뛴다. 같은 id가 두 파일에 있으면 먼저
  // import한 쪽만 남고 나머지(급수·읽기 정정 포함)는 조용히 버려진다.
  test.each(["kanji-", "vocab-", "sentences-", "particles-", "expressions-"])(
    "%s 시드는 파일 사이에서 id가 겹치지 않는다",
    (prefix) => {
      const all = ids(prefix);
      const bare = all.map((x) => x.split("  ")[0]);
      const dup = bare.filter((id, i) => bare.indexOf(id) !== i);
      expect(dup, `중복 id: ${dup.join(", ")}`).toEqual([]);
    },
  );
});

describe("expression seeds", () => {
  const dir = path.join(process.cwd(), "data/seeds");
  const cards = readdirSync(dir)
    .filter((f) => f.startsWith("expressions-") && f.endsWith(".json"))
    .flatMap((f) =>
      (JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, unknown>[]).map(
        (c, i) => ({ file: f, i, c }),
      ),
    );

  test("모든 카드가 add-expression 검증을 통과한다", () => {
    for (const { file, i, c } of cards) {
      expect(() => validateExpression(c, i), file).not.toThrow();
    }
  });

  // 한자가 들어 있는데 ruby가 없거나, ruby가 표현과 어긋나면 카드 앞면이 틀어진다.
  test("ruby를 벗기면 expression_jp와 같고, 후리가나는 가나뿐이다", () => {
    const KANJI = /[\u4e00-\u9fff]/;
    for (const { file, c } of cards) {
      const jp = c.expression_jp as string;
      const ruby = c.ruby as string | undefined;
      if (!ruby) {
        expect(KANJI.test(jp), `${file} ${c.id}: 한자가 있는데 ruby가 없다`).toBe(false);
        continue;
      }
      const segs = parseMarkup(ruby);
      expect(stripMarkup(segs), `${file} ${c.id}`).toBe(jp);
      for (const seg of segs) {
        if (seg.kind === "ruby") {
          expect(seg.furigana, `${c.id} ${seg.base}`).toMatch(/^[\u3041-\u309f\u30fc]+$/);
        }
      }
    }
  });
});

describe("vocab seeds", () => {
  const dir = path.join(process.cwd(), "data/seeds");
  const cards = readdirSync(dir)
    .filter((f) => f.startsWith("vocab-") && f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as VocabCard[]);

  const KANA = /^[\u3041-\u309f\u30a0-\u30ff]+$/;

  // ruby의 후리가나로 base를 치환하면 reading과 같아야 한다 — 오타(예: たべる→たへる)를
  // 막는다. 카드 앞면의 후리가나와 정답 reading이 따로 놀면 안 된다.
  test("ruby가 word·reading과 일치하고 reading은 가나뿐이다", () => {
    for (const c of cards) {
      expect(c.reading, `${c.id} reading`).toMatch(KANA);
      if (!c.ruby) continue;
      const segs = parseMarkup(c.ruby);
      expect(stripMarkup(segs), `${c.id} ruby→word`).toBe(c.word);
      const read = segs
        .map((g) => (g.kind === "ruby" ? g.furigana : g.kind === "text" ? g.text : ""))
        .join("");
      expect(read, `${c.id} ruby→reading`).toBe(c.reading);
    }
  });

  // verbGroup/adjGroup이 틀리면 활용 퀴즈가 틀린 정답을 낸다. 엔진이 던지지 않고,
  // 기본형·마스형이 말이 되는지 본다.
  test("verbGroup은 활용 엔진을 통과한다", () => {
    for (const c of cards) {
      if (!c.verbGroup || c.verbGroup === "not_verb") continue;
      for (const form of ALL_CONJUGATION_FORMS) {
        expect(() => conjugate(c.word, c.verbGroup!, form), `${c.id} ${form}`).not.toThrow();
      }
    }
  });

  // る로 끝나는 五段(帰る・入る・走る・切る)은 一段처럼 보여 그룹을 잘못 넣기 쉽다.
  // 시드의 verbGroup으로 활용한 결과가 실제 일본어와 같은지 직접 대조한다.
  test.each([
    ["帰る", "te", "帰って"],
    ["入る", "ta", "入った"],
    ["走る", "nai", "走らない"],
    ["切る", "masu", "切ります"],
    ["起きる", "te", "起きて"],
    ["見る", "nai", "見ない"],
    ["借りる", "ta", "借りた"],
    ["書く", "te", "書いて"],
    ["飲む", "te", "飲んで"],
    ["買う", "nai", "買わない"],
    ["話す", "ta", "話した"],
    ["来る", "te", "来て"],
    ["する", "nai", "しない"],
    ["散歩する", "masu", "散歩します"],
  ] as const)("%s의 %s형은 %s", (word, form, expected) => {
    const card = cards.find((c) => c.word === word);
    expect(card, `${word} 시드 없음`).toBeDefined();
    expect(conjugate(word, card!.verbGroup!, form)).toBe(expected);
  });

  // 타이핑 모드는 한국어 뜻을 완전 일치로 비교한다 (lib/normalize.ts). 뜻에 "(글을) 쓰다"
  // 같은 괄호가 있으면 "쓰다"라고 쳐도 오답이 된다. 보조 설명은 meanings(영어)에 둔다.
  test("한국어 뜻에는 괄호가 없다", () => {
    for (const c of cards) {
      for (const m of c.koreanMeanings) expect(m, `${c.id}: ${m}`).not.toMatch(/[()（）]/);
    }
  });

  test("그룹이 정해진 카드는 한쪽 품사뿐이다", () => {
    for (const c of cards) {
      const isVerb = !!c.verbGroup && c.verbGroup !== "not_verb";
      const isAdj = !!c.adjGroup && c.adjGroup !== "not_adj";
      expect(isVerb && isAdj, `${c.id}: 동사이면서 형용사`).toBe(false);
    }
  });

  test("い형용사는 い로 끝나고 활용 엔진을 통과한다", () => {
    for (const c of cards) {
      if (c.adjGroup === "i_adj") expect(c.reading, c.id).toMatch(/い$/);
      if (c.adjGroup && c.adjGroup !== "not_adj") {
        expect(() => conjugateAdj(c.word, c.adjGroup!, "negative"), c.id).not.toThrow();
      }
    }
  });
});

describe("sentence seeds", () => {
  const dir = path.join(process.cwd(), "data/seeds");
  const files = readdirSync(dir).filter(
    (f) => (f.startsWith("sentences-") || f.startsWith("particles-")) && f.endsWith(".json"),
  );
  type S = { id: string; sentence: string; sentenceRuby?: string; blank: string; blankRuby?: string; distractors: string[] };
  const load = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as S[];

  test("빈칸은 하나, 오답은 서로 다른 3개이고 정답과 다르다", () => {
    for (const f of files) {
      for (const c of load(f)) {
        expect(c.sentence.split("＿＿＿").length - 1, `${f} ${c.id}: 빈칸 개수`).toBe(1);
        expect(c.distractors, `${f} ${c.id}`).toHaveLength(3);
        expect(new Set(c.distractors).size, `${c.id}: 오답 중복`).toBe(3);
        expect(c.distractors, `${c.id}: 정답이 오답에 섞임`).not.toContain(c.blank);
      }
    }
  });

  test("ruby를 벗기면 원문과 같다", () => {
    for (const f of files) {
      for (const c of load(f)) {
        if (c.sentenceRuby) expect(stripMarkup(parseMarkup(c.sentenceRuby)), `${c.id} sentence`).toBe(c.sentence);
        if (c.blankRuby) expect(stripMarkup(parseMarkup(c.blankRuby)), `${c.id} blank`).toBe(c.blank);
      }
    }
  });

  // 오래된 배치는 傘·時計·花가 오답을 독점했다 (전 시드의 25%). 새 배치는 오답이
  // 몇 단어로 쏠리면 "저건 정답이 아니다"를 외우게 되므로 한 단어의 몫을 제한한다.
  // 어디서도 정답이 아닌 단어가 오답으로 자주 나오면 일본어를 몰라도 "저건 정답이
  // 아니다"로 지운다. 時計·花가 286장 중 43·39장에 나오던 것을 A_0007에서 분산했다.
  // 정답으로도 쓰이는 단어는 소거 단서가 아니라서 세지 않는다.
  test("정답으로 쓰이지 않는 오답 단어가 문장 카드의 9%를 넘지 않는다", () => {
    const cards = files.filter((f) => f.startsWith("sentences-")).flatMap(load);
    const answers = new Set(cards.map((c) => c.blank));
    const use = new Map<string, number>();
    for (const c of cards) for (const d of c.distractors) use.set(d, (use.get(d) ?? 0) + 1);
    const worst = [...use]
      .filter(([w]) => !answers.has(w))
      .sort((a, b) => b[1] - a[1])[0];
    expect(worst[1] / cards.length, `${worst[0]}가 ${worst[1]}/${cards.length}장`).toBeLessThanOrEqual(0.09);
  });

  test.each(files.filter((f) => f.startsWith("sentences-daily-")))(
    "%s: 한 단어가 오답의 15% 넘는 카드에 쓰이지 않는다",
    (f) => {
      const cards = load(f);
      const use = new Map<string, number>();
      for (const c of cards) for (const d of c.distractors) use.set(d, (use.get(d) ?? 0) + 1);
      const [word, n] = [...use].sort((a, b) => b[1] - a[1])[0];
      expect(n / cards.length, `${word}가 ${n}/${cards.length}장`).toBeLessThanOrEqual(0.15);
    },
  );
});

describe("grammar seeds", () => {
  const dir = path.join(process.cwd(), "data");
  // grammar-seed-sample.json도 실제로 DB에 들어간 데이터다 (단원 b1이 particle-wa-ga를 참조).
  // 여기서 빼면 다른 파일과 id가 겹쳐도 못 잡는다 — add-grammar는 겹치는 id를 조용히 건너뛴다.
  const files = readdirSync(dir).filter((f) => f.startsWith("grammar-") && f.endsWith(".json"));
  const load = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as unknown;

  test.each(files)("%s는 스키마를 통과한다", (f) => {
    // 스키마 위반이면 던진다 (zod 이슈가 메시지에 담긴다).
    const cards = parseGrammarCardArray(load(f));
    expect(cards.length).toBeGreaterThan(0);
  });

  test("파일 사이에서 id가 겹치지 않는다", () => {
    const ids = files.flatMap((f) => (load(f) as { id: string }[]).map((c) => c.id));
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  type Pattern = {
    id: string;
    type: string;
    pattern: string;
    examples: { jp: string }[];
    quizzes: { sentence: string; correct: string; distractors: string[] }[];
  };

  test("문형 카드: 예문에 하이라이트가 있고 정답은 오답과 다르다", () => {
    for (const f of files) {
      for (const c of (load(f) as Pattern[]).filter((x) => x.type === "pattern")) {
        for (const ex of c.examples) {
          expect(ex.jp, `${c.id}: 예문에 [[하이라이트]]가 없다`).toMatch(/\[\[.+\]\]/);
        }
        for (const q of c.quizzes) {
          expect(q.distractors, `${c.id}: 정답이 오답에 섞임`).not.toContain(q.correct);
          expect(new Set(q.distractors).size, `${c.id}: 오답 중복`).toBe(3);
        }
      }
    }
  });
});

describe("kanji seeds", () => {
  const dir = path.join(process.cwd(), "data/seeds");
  type K = { id: string; onReadings: string[]; kunReadings: string[]; koreanMeaning: string };
  const cards = readdirSync(dir)
    .filter((f) => f.startsWith("kanji-") && f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as K[]);

  test("읽기는 히라가나뿐이고 같은 읽기가 음독·훈독에 겹치지 않는다", () => {
    for (const c of cards) {
      for (const r of [...c.onReadings, ...c.kunReadings]) {
        expect(r, `${c.id}: ${r}`).toMatch(/^[ぁ-ゖ]+$/);
      }
      expect(c.onReadings.filter((r) => c.kunReadings.includes(r)), `${c.id}`).toEqual([]);
    }
  });

  // A_* 마이그레이션은 이미 들어간 DB 행을 고친다. 시드가 그 값을 따라가지 않으면 새 DB를
  // 만들 때 (migrate → add-kanji 순서) 수정 전 값이 다시 들어간다 — 실제로 훈독 103개가
  // 어간(た・よ…)으로 남아 있었다.
  test("시드가 A_* 마이그레이션의 kanji_cards 수정과 일치한다 (마지막 수정 기준)", () => {
    const byId = new Map(cards.map((c) => [c.id, c]));
    const col = { kun_readings: "kunReadings", on_readings: "onReadings", korean_meaning: "koreanMeaning" } as const;
    const migDir = path.join(process.cwd(), "lib/db/migrations");
    const last = new Map<string, { file: string; want: unknown }>();
    for (const f of readdirSync(migDir).filter((x) => x.startsWith("A_")).sort()) {
      const sql = readFileSync(path.join(migDir, f), "utf8").replace(/--[^\n]*/g, "");
      for (const [, sets, id] of sql.matchAll(/UPDATE\s+kanji_cards\s+SET\s+([\s\S]*?)\s+WHERE\s+id\s*=\s*'([^']+)'\s*;/g)) {
        if (!byId.has(id)) continue; // DB에만 있는 행 (시드 없음) — 비교 대상이 아니다.
        for (const [, c, v] of sets.matchAll(/(\w+)\s*=\s*(JSON_ARRAY\([^)]*\)|'[^']*')/g)) {
          const field = col[c as keyof typeof col];
          if (!field) continue;
          const want = v.startsWith("JSON_ARRAY") ? [...v.matchAll(/'([^']*)'/g)].map((m) => m[1]) : v.slice(1, -1);
          last.set(`${id}\u0000${field}`, { file: f, want });
        }
      }
    }
    for (const [key, { file, want }] of last) {
      const [id, field] = key.split("\u0000") as [string, keyof K];
      expect(byId.get(id)?.[field], `${file}: ${id}.${field}`).toEqual(want);
    }
  });
});

// 이미 들어간 DB 행은 A_* 마이그레이션이 고친다. 시드가 그 값을 따라가지 않으면 새 DB를
// 만들 때 (migrate → add-* 순서) 고치기 전 값이 다시 들어간다. 테이블마다 마지막 수정이
// 이긴다. DB에만 있는 행(시드 없음)은 건너뛴다.
describe("seeds follow A_* data migrations", () => {
  const seedDir = path.join(process.cwd(), "data/seeds");
  const migDir = path.join(process.cwd(), "lib/db/migrations");
  const tables: Record<string, { prefixes: string[]; cols: Record<string, string> }> = {
    sentence_cards: {
      prefixes: ["sentences-", "particles-"],
      cols: { sentence: "sentence", sentence_ruby: "sentenceRuby", blank: "blank", blank_ruby: "blankRuby", distractors: "distractors", translation: "translation", jlpt_level: "jlptLevel" },
    },
    vocab_cards: {
      prefixes: ["vocab-"],
      cols: { word: "word", reading: "reading", meanings: "meanings", korean_meanings: "koreanMeanings", ruby: "ruby", jlpt_level: "jlptLevel", verb_group: "verbGroup", adj_group: "adjGroup" },
    },
    expression_cards: {
      prefixes: ["expressions-"],
      cols: { situation_ko: "situation_ko", expression_jp: "expression_jp", ruby: "ruby", register: "register", translation_ko: "translation_ko", note_ko: "note_ko" },
    },
  };
  const parseValue = (v: string): unknown =>
    v.startsWith("JSON_ARRAY")
      ? [...v.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'"))
      : v === "NULL"
        ? undefined
        : /^\d+$/.test(v)
          ? Number(v)
          : v.slice(1, -1).replace(/''/g, "'");

  test.each(Object.keys(tables))("%s", (table) => {
    const { prefixes, cols } = tables[table];
    const seed = new Map<string, Record<string, unknown>>();
    for (const f of readdirSync(seedDir).filter((x) => prefixes.some((p) => x.startsWith(p)) && x.endsWith(".json"))) {
      for (const c of JSON.parse(readFileSync(path.join(seedDir, f), "utf8")) as Record<string, unknown>[]) seed.set(String(c.id), c);
    }
    const last = new Map<string, { file: string; value: unknown }>();
    for (const f of readdirSync(migDir).filter((x) => x.startsWith("A_")).sort()) {
      const sql = readFileSync(path.join(migDir, f), "utf8").replace(/--[^\n]*/g, "");
      for (const [, t, sets, where] of sql.matchAll(/UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)\s+WHERE\s+([\s\S]*?);/g)) {
        if (t !== table) continue;
        const ids = [...where.matchAll(/'([^']+)'/g)].map((m) => m[1]);
        for (const [, col, v] of sets.matchAll(/(\w+)\s*=\s*(JSON_ARRAY\((?:[^)(]|'[^']*')*\)|'(?:[^']|'')*'|NULL|\d+)/g)) {
          const field = cols[col];
          expect(field, `${f}: 매핑 없는 컬럼 ${table}.${col}`).toBeDefined();
          for (const id of ids) last.set(`${id}\u0000${field}`, { file: f, value: parseValue(v) });
        }
      }
    }
    for (const [key, { file, value }] of last) {
      const [id, field] = key.split("\u0000");
      const card = seed.get(id);
      if (!card) continue;
      expect(card[field], `${file}: ${id}.${field}`).toEqual(value);
    }
  });
});
