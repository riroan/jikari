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
