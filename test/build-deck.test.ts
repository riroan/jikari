import { describe, expect, test } from "vitest";


describe("조사 분리", () => {
  test("splitParticle: 조사로 끝나는 청크를 단어와 조사로 가른다", async () => {
    const { splitParticle } = await import("@/lib/build-deck");
    expect(splitParticle("{新聞|しんぶん}を")).toEqual(["{新聞|しんぶん}", "を"]);
    expect(splitParticle("{学校|がっこう}に")).toEqual(["{学校|がっこう}", "に"]);
    expect(splitParticle("{私|わたし}は")).toEqual(["{私|わたし}", "は"]);
    // 가나 뒤의 に/で는 단어 내부일 수 있어 가르지 않는다 (ので 등)
    expect(splitParticle("ので")).toEqual(["ので"]);
    expect(splitParticle("きれいに")).toEqual(["きれいに"]);
    expect(splitParticle("これを")).toEqual(["これ", "を"]);
    expect(splitParticle("{読|よ}みます")).toEqual(["{読|よ}みます"]);
  });

  test("splitItem 후에도 이어 붙이면 원문과 같다", async () => {
    const { splitItem } = await import("@/lib/build-deck");
    const { segmentSentence } = await import("@/lib/build-chunks");
    const m = "{私|わたし}は{毎朝|まいあさ}{新聞|しんぶん}を{読|よ}みます。";
    const chunks = segmentSentence(m)!;
    const out = splitItem({ id: "x", markup: m, chunks, ko: "" });
    expect(out.chunks.join("")).toBe(m);
    expect(out.chunks.length).toBeGreaterThan(chunks.length);
  });

  test("함정 조사는 문장에 없는 조사만, 같은 seed면 같은 결과", async () => {
    const { pickParticleDistractors } = await import("@/lib/build-deck");
    const item = { id: "x", markup: "", chunks: ["{私|わたし}", "は", "{新聞|しんぶん}", "を", "{読|よ}みます。"], ko: "" };
    for (let seed = 0; seed < 30; seed++) {
      const d = pickParticleDistractors(item, seed);
      expect(d).toHaveLength(2);
      expect(d).not.toContain("は");
      expect(d).not.toContain("を");
      expect(d).toEqual(pickParticleDistractors(item, seed));
    }
  });
});

describe("minChunks", () => {
  test("두 덩어리 문장은 기본으로는 빠지고, minChunks=2면 들어오며 조사 분리 후 3조각 이상", async () => {
    const { buildItems, splitItem } = await import("@/lib/build-deck");
    const ex = [{ id: "e", situation_ko: "", expression_jp: "傘を貸してもらえませんか。", register: "polite" as const, translation_ko: "우산을 빌려 줄 수 있나요?", ruby: "{傘|かさ}を{貸|か}してもらえませんか。" }];
    expect(buildItems([], ex)).toHaveLength(0);
    const items = buildItems([], ex, 2);
    expect(items).toHaveLength(1);
    expect(splitItem(items[0]).chunks.length).toBeGreaterThanOrEqual(3);
  });
});

test("바꿔 써도 되는 조사는 함정으로 주지 않는다 (に↔へ, は↔が↔も)", async () => {
  const { pickParticleDistractors } = await import("@/lib/build-deck");
  const item = { id: "x", markup: "", chunks: ["{私|わたし}", "は", "{先|さき}", "に", "{着|つ}いて"], ko: "" };
  for (let seed = 0; seed < 60; seed++) {
    const d = pickParticleDistractors(item, seed, 4);
    for (const bad of ["は", "が", "も", "に", "へ"]) expect(d).not.toContain(bad);
  }
});
