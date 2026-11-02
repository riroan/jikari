import { describe, expect, it } from "vitest";
import { buildExampleIndex, findExamples } from "@/lib/examples";
import type { ExpressionCard, SentenceCard } from "@/lib/types";

const s = (sentence: string, blank: string, sentenceRuby?: string): SentenceCard =>
  ({ id: sentence, category: "vocab", sentence, sentenceRuby, blank, distractors: [], translation: "번역", jlptLevel: 5 }) as SentenceCard;
const idx = buildExampleIndex(
  [
    s("毎日、水を＿＿＿。", "飲む", "{毎日|まいにち}、{水|みず}を＿＿＿。"),
    s("日本に行きます。", "x"),
    s("銀行はあそこです。", "x"),
    s("ご飯を食べました。", "x"),
    s("本を読む。", "x"),
    s("はいる。", "x"),
  ],
  [{ id: "e", expression_jp: "お疲れ様でした", ruby: "{お疲|つか}れ{様|さま}でした", translation_ko: "수고", situation_ko: "", register: "polite" } as ExpressionCard],
);
const w = (word: string, g?: object) => findExamples({ word, ...g }, idx, 5).map((e) => e.plain);

describe("findExamples", () => {
  it("fills the blank and keeps ruby", () => {
    expect(findExamples({ word: "水" }, idx)[0].ruby).toBe("{毎日|まいにち}、{水|みず}を飲む。");
  });
  it("matches verb stems", () => {
    expect(w("食べる", { verbGroup: "ichidan" })).toEqual(["ご飯を食べました。"]);
    expect(w("飲む", { verbGroup: "godan" })).toHaveLength(1);
  });
  it("1-char stem needs kana after and no kanji before (no 銀行)", () => {
    expect(w("行く", { verbGroup: "godan" })).toEqual(["日本に行きます。"]);
  });
  it("1-char kanji word is not matched inside compounds", () => {
    expect(w("本")).toEqual(["本を読む。"]);
  });
  it("short kana words are skipped", () => {
    expect(w("いる", { verbGroup: "ichidan" })).toEqual([]);
  });
  it("no match -> empty; searches expressions; caps at 2", () => {
    expect(w("猫")).toEqual([]);
    expect(w("お疲れ様")).toEqual(["お疲れ様でした"]);
    expect(findExamples({ word: "を" }, idx)).toEqual([]);
    expect(findExamples({ word: "日本" }, idx, 2).length).toBeLessThanOrEqual(2);
    expect(findExamples({ word: "行きます" }, idx, 1)).toHaveLength(1);
  });
});

describe("godan te/ta forms", () => {
  const ix = buildExampleIndex(
    [
      s("水を飲んだ。", "x"), s("手紙を書いて送る。", "x"), s("学校に行った。", "x"),
      s("泳いでいる。", "x"), s("話して笑う。", "x"), s("待って。", "x"),
      s("遊んで帰る。", "x"), s("手を洗った。", "x"), s("銀行った。", "x"), s("あった。", "x"),
    ],
    [],
  );
  const m = (word: string) => findExamples({ word, verbGroup: "godan" }, ix, 5).map((e) => e.plain);
  it("matches sound-change forms", () => {
    expect(m("飲む")).toEqual(["水を飲んだ。"]);
    expect(m("書く")).toEqual(["手紙を書いて送る。"]);
    expect(m("行く")).toEqual(["学校に行った。"]);
    expect(m("泳ぐ")).toEqual(["泳いでいる。"]);
    expect(m("話す")).toEqual(["話して笑う。"]);
    expect(m("待つ")).toEqual(["待って。"]);
    expect(m("遊ぶ")).toEqual(["遊んで帰る。"]);
  });
  it("does not use the wrong ending or match kana-only words", () => {
    expect(m("洗う")).toEqual(["手を洗った。"]);
    expect(m("飲む")).not.toContain("水を飲いた。");
    expect(m("ある")).toEqual([]);
  });
});
