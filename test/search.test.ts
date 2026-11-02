import { describe, expect, it } from "vitest";
import { buildIndex, search, type SearchSource } from "@/lib/search";

const src: SearchSource = {
  kanji: [
    {
      id: "k1", kanji: "食", onReadings: ["ショク"], kunReadings: ["た.べる"],
      meanings: ["eat"], jlptLevel: 5, koreanHanja: "食", koreanSound: ["식"], koreanMeaning: "먹을",
    },
  ],
  vocab: [
    { id: "v1", word: "食べる", reading: "たべる", meanings: ["to eat"], koreanMeanings: ["먹다"], ruby: "{食|た}べる", jlptLevel: 5 },
    { id: "v2", word: "食べ物", reading: "たべもの", meanings: ["food"], koreanMeanings: ["음식"], jlptLevel: 5 },
    { id: "v3", word: "お食事", reading: "おしょくじ", meanings: ["meal"], koreanMeanings: ["식사"], jlptLevel: 5 },
  ],
  sentences: [
    { id: "s1", category: "vocab", sentence: "パンを＿＿＿。", sentenceRuby: "パンを＿＿＿。", blank: "食べる", blankRuby: "{食|た}べる", distractors: [], translation: "빵을 먹는다.", jlptLevel: 5 },
  ],
  expressions: [
    { id: "e1", situation_ko: "식사 전에", expression_jp: "いただきます", register: "polite", translation_ko: "잘 먹겠습니다" },
  ],
  grammar: [
    {
      id: "g1", type: "pattern", pattern: "〜たい", koreanStructure: "〜하고 싶다", meaningKo: "하고 싶다",
      examples: [{ jp: "{食|た}べたい", ko: "먹고 싶다" }], quizzes: [], jlptLevel: 5,
    },
  ],
};
const idx = buildIndex(src);
const keys = (q: string) => search(idx, q).hits.map((h) => h.key);

describe("search", () => {
  it("empty query returns nothing", () => {
    expect(search(idx, "  ")).toEqual({ hits: [], total: 0 });
  });
  it("romaji matches kana reading, exact before prefix before contains", () => {
    const k = keys("tabemono");
    expect(k[0]).toBe("vocab:v2");
    const r = keys("taberu");
    expect(r.slice(0, 2)).toContain("vocab:v1"); // kanji kun reading ties as exact
  });
  it("katakana query matches hiragana reading", () => {
    expect(keys("タベル")).toContain("vocab:v1");
  });
  it("kanji query ranks exact kanji first, then prefix, then contains", () => {
    const k = keys("食");
    expect(k[0]).toBe("kanji:k1");
    expect(k.indexOf("vocab:v1")).toBeLessThan(k.indexOf("vocab:v3"));
  });
  it("Korean query matches meanings across subjects", () => {
    const k = keys("먹");
    expect(k).toEqual(expect.arrayContaining(["vocab:v1", "sentence:s1", "expression:e1", "kanji:k1"]));
  });
  it("finds sentences by reading and strips pattern tilde", () => {
    expect(keys("ぱんをたべる")).toContain("sentence:s1");
    expect(keys("たい")).toContain("grammar:g1");
  });
  it("caps hits but reports total", () => {
    const r = search(idx, "食", 2);
    expect(r.hits).toHaveLength(2);
    expect(r.total).toBeGreaterThan(2);
  });
});

describe("English prefix", () => {
  const i2 = buildIndex({
    ...src,
    vocab: [{ id: "v9", word: "水", reading: "みず", meanings: ["water"], koreanMeanings: ["물"], jlptLevel: 5 }],
  });
  it.each(["wat", "water"])("%s matches mid-word", (q) => {
    expect(search(i2, q).hits.map((h) => h.key)).toContain("vocab:v9");
  });
});
