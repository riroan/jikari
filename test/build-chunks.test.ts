import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { isAssembled, MAX_CHUNKS, MIN_CHUNKS, segmentSentence } from "@/lib/build-chunks";
import { buildItems } from "@/lib/build-deck";

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
    expect(items.length).toBeGreaterThan(50);
  });

  test("never throws on any card", () => {
    for (const c of [...sentences, ...expressions]) {
      const m = c.sentenceRuby ?? c.ruby ?? c.sentence ?? c.expression_jp;
      expect(() => segmentSentence(m)).not.toThrow();
    }
  });
});
