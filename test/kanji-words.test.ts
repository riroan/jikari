import { describe, expect, it } from "vitest";
import { wordsWithKanji } from "@/lib/kanji-words";
import type { VocabCard } from "@/lib/types";

const v = (word: string, jlptLevel: 5 | 4 | 3 | 2 | 1): VocabCard =>
  ({ id: word, word, reading: "", meanings: [], koreanMeanings: [], jlptLevel }) as VocabCard;
const vocab = [v("日本語", 5), v("日", 5), v("毎日", 4), v("日曜日", 5), v("今日", 5), v("日常", 2), v("本", 5)];

describe("wordsWithKanji", () => {
  it("skips the kanji's own card, easiest level first then shortest, capped at 3", () => {
    expect(wordsWithKanji("日", vocab).map((x) => x.word)).toEqual(["今日", "日本語", "日曜日"]);
  });
  it("returns [] when none; max respected", () => {
    expect(wordsWithKanji("猫", vocab)).toEqual([]);
    expect(wordsWithKanji("日", vocab, 1)).toHaveLength(1);
  });
});
