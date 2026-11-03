import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { isAssembled, MAX_CHUNKS, MIN_CHUNKS, segmentSentence } from "@/lib/build-chunks";
import { buildItems, pickDistractors } from "@/lib/build-deck";

describe("segmentSentence", () => {
  test("splits after particles and keeps ruby", () => {
    expect(segmentSentence("{私|わたし}は{水|みず}を{飲|の}みます。")).toEqual([
      "{私|わたし}は",
      "{水|みず}を",
      "{飲|の}みます。",
    ]);
  });
  test("noun + です is split, trailing punctuation sticks", () => {
    expect(segmentSentence("{今日|きょう}は{学生|がくせい}です。")).toEqual([
      "{今日|きょう}は",
      "{学生|がくせい}",
      "です。",
    ]);
  });
  test("too short, or leftover markup -> null", () => {
    expect(segmentSentence("ありがとう")).toBeNull();
    expect(segmentSentence("[[私は]]水を飲む")).toBeNull();
  });
  test("caps at 7 chunks", () => {
    const s = "{私|わたし}は{彼|かれ}が{水|みず}を{毎日|まいにち}{駅|えき}で{友|とも}と{会|あ}い、{家|いえ}へ{帰|かえ}る。";
    const c = segmentSentence(s)!;
    expect(c.length).toBeLessThanOrEqual(MAX_CHUNKS);
    expect(c.join("")).toBe(s);
  });
});

describe("rough-cut rules", () => {
  test("fixed phrases are never split", () => {
    const c = segmentSentence("{私|わたし}は{先生|せんせい}にありがとうございます。")!;
    expect(c.join("")).toBe("{私|わたし}は{先生|せんせい}にありがとうございます。");
    expect(c.some((x) => x.includes("ありがとう"))).toBe(true);
    const d = segmentSentence("{私|わたし}は{友達|ともだち}と{朝|あさ}こんにちはと{言|い}う。")!;
    expect(d.some((x) => x.includes("こんにちは"))).toBe(true);
  });
  test("から + の stays together", () => {
    const c = segmentSentence("{母|はは}からの{手紙|てがみ}に{返事|へんじ}を{書|か}く。")!;
    expect(c[0]).toBe("{母|はは}からの");
  });
  test("surrogate-pair characters are not treated as ruby units", () => {
    const s = "𠮷{野|の}家で{友達|ともだち}と{食|た}べる。";
    const c = segmentSentence(s)!;
    expect(c.join("")).toBe(s);
    expect(segmentSentence("𠮷は{水|みず}を{飲|の}む。")![0]).toBe("𠮷は");
  });
});

describe("quality rules", () => {
  const plainOf = (c: string[]) => c.map((x) => x.replace(/\{([^|]+)\|[^}]+\}/g, "$1"));
  test("time words and quantities are their own chunk", () => {
    expect(plainOf(segmentSentence("{父|ちち}は{毎朝|まいあさ}{新聞|しんぶん}を{読|よ}む。")!)).toEqual(["父は", "毎朝", "新聞を", "読む。"]);
    expect(plainOf(segmentSentence("{本屋|ほんや}で{ノート|のーと}を{一冊|いっさつ}{買|か}いました。")!).includes("一冊")).toBe(true);
  });
  test("午前十時に stays together", () => {
    expect(plainOf(segmentSentence("{午前|ごぜん}{十時|じゅうじ}に{学校|がっこう}に{行|い}く。")!)[0]).toBe("午前十時に");
  });
  test("での / について are not split", () => {
    expect(segmentSentence("{日本|にほん}での{生活|せいかつ}は{楽|たの}しい。")).toBeNull();
    expect(plainOf(segmentSentence("{私|わたし}は{日本|にほん}について{先生|せんせい}と{話|はな}す。")!)).toContain("日本について");
  });
  test("ありがとう is never cut", () => {
    expect(segmentSentence("ありがとう。{助|たす}かったよ。")).toBeNull();
  });
});

describe("isAssembled", () => {
  const orig = ["{私|わたし}は", "{水|みず}を", "飲む"];
  test("exact, wrong and equivalent arrangements", () => {
    expect(isAssembled(orig, orig)).toBe(true);
    expect(isAssembled([orig[1], orig[0], orig[2]], orig)).toBe(false);
    expect(isAssembled(["ねえ", "ねえ", "ね"], ["ねえ", "ねえ", "ね"])).toBe(true);
    expect(isAssembled(["ab", "c"], ["a", "bc"])).toBe(true);
  });
});

describe("all tracked seed cards", () => {
  const dir = path.join(__dirname, "../data/seeds");
  const files = readdirSync(dir).filter((f) => /^(sentences|expressions)/.test(f));
  const load = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Record<string, string>[];
  const sentences = files.filter((f) => f.startsWith("sentences")).flatMap(load);
  const expressions = files.filter((f) => f.startsWith("expressions")).flatMap(load);
  const items = buildItems(sentences as never, expressions as never);

  test("reconstruction invariant + bounds hold for every eligible card", () => {
    for (const it of items) {
      expect(it.chunks.join(""), it.id).toBe(it.markup);
      expect(it.chunks.length, it.id).toBeGreaterThanOrEqual(MIN_CHUNKS);
      expect(it.chunks.length, it.id).toBeLessThanOrEqual(MAX_CHUNKS);
    }
    console.log(`build-eligible: ${items.length} of ${sentences.length + expressions.length}`);
    expect(items.length).toBeGreaterThanOrEqual(122);
  });

  test("distractors: deterministic, never text-equal or contained in the sentence", () => {
    const plain = (c: string) => c.replace(/\{([^|]+)\|[^}]+\}/g, "$1");
    for (const [k, it] of items.entries()) {
      const d = pickDistractors(it, items, k);
      expect(d, it.id).toEqual(pickDistractors(it, items, k));
      expect(d.length, it.id).toBeGreaterThanOrEqual(1);
      expect(d.length, it.id).toBeLessThanOrEqual(2);
      for (const x of d) {
        expect(it.chunks.map(plain), it.id).not.toContain(plain(x));
        expect(plain(it.markup), it.id).not.toContain(plain(x));
      }
    }
  });

  test("never throws on any card", () => {
    for (const c of [...sentences, ...expressions]) {
      const m = c.sentenceRuby ?? c.ruby ?? c.sentence ?? c.expression_jp;
      expect(() => segmentSentence(m)).not.toThrow();
    }
  });
});
