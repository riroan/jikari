import { describe, expect, test } from "vitest";
import { sinoKoreanHint } from "@/lib/sino-korean";

describe("sinoKoreanHint", () => {
  test.each([
    ["학", ["がく"], "ㄱ"], // 学
    ["일", ["にち", "じつ"], "ㄹ"], // 日
    ["생", ["せい", "しょう"], "ㅇ"], // 生
    ["급", ["きゅう"], "ㅂ"], // 急
    ["산", ["さん"], "ㄴ"], // 山
    ["삼", ["さん"], "ㅁ"], // 三
  ] as const)("%s %j → 받침 %s", (sound, on, batchim) => {
    expect(sinoKoreanHint([sound], on)?.batchim).toBe(batchim);
  });

  test("받침 없는 음은 힌트가 없다 (화 → か)", () => {
    expect(sinoKoreanHint(["화"], ["か"])).toBeNull();
  });

  test("규칙에 안 맞으면 힌트가 없다 (ㄱ인데 음독이 く·き로 안 끝남)", () => {
    expect(sinoKoreanHint(["각"], ["かん"])).toBeNull();
  });

  test("한 글자 음독은 받침의 흔적으로 치지 않는다", () => {
    expect(sinoKoreanHint(["목"], ["き"])).toBeNull();
  });

  test("여러 음 중 맞는 쌍을 고른다", () => {
    expect(sinoKoreanHint(["악", "락"], ["らく"])).toMatchObject({ sound: "악", reading: "らく", batchim: "ㄱ" });
  });

  test("한글이 아니거나 비어 있으면 null", () => {
    expect(sinoKoreanHint([], ["がく"])).toBeNull();
    expect(sinoKoreanHint(["a"], ["がく"])).toBeNull();
  });
});
