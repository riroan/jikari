import { describe, it, expect } from "vitest";
import { PHRASE_PACKS, packPhrases } from "@/lib/phrase-packs";
import { pickDailySource } from "@/lib/daily-phrase";
import { nonJoyoChars } from "@/lib/joyo";
import { COSMETICS } from "@/lib/cosmetics";
import { DEFAULT_PROGRESSION, buyItem } from "@/lib/progression";

describe("phrase packs", () => {
  it("모든 팩 문구의 한자가 상용한자 안이다", () => {
    for (const pack of Object.values(PHRASE_PACKS))
      for (const p of pack.phrases) expect(nonJoyoChars(p.jp.replace(/\|[^}]*\}/g, ""))).toEqual([]);
  });

  it("상점 팩 id와 문구 팩이 1:1로 맞는다", () => {
    const shopPacks = COSMETICS.filter((c) => c.slot === "pack").map((c) => c.id).sort();
    expect(shopPacks).toEqual(Object.keys(PHRASE_PACKS).sort());
  });

  it("계절 인사는 그 달 것만, 비면 전체", () => {
    expect(packPhrases("pack:kisetsu", 4).every((p) => p.months?.includes(4))).toBe(true);
    expect(packPhrases("pack:kotowaza", 4)).toHaveLength(PHRASE_PACKS["pack:kotowaza"].phrases.length);
  });

  it("팩이 없으면 언제나 일상표현, 있으면 날짜로 고정된 출처", () => {
    expect(pickDailySource(1, "2026-11-06")).toBe(0);
    const s = pickDailySource(3, "2026-11-06");
    expect(s).toBe(pickDailySource(3, "2026-11-06"));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(3);
  });

  it("팩을 사면 보유만 되고 장착 슬롯은 건드리지 않는다", () => {
    const p = buyItem({ ...DEFAULT_PROGRESSION, xp: 5000 }, "pack:yoji", 1)!;
    expect(p.items).toEqual(["pack:yoji"]);
    expect(p.equip).toEqual(DEFAULT_PROGRESSION.equip);
  });
});
