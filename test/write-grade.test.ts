import { describe, expect, test } from "vitest";
import { acceptableForms, judgeWriting } from "@/lib/write-grade";

const M = "{私|わたし}は{毎朝|まいあさ}{新聞|しんぶん}を{読|よ}みます。";

describe("acceptableForms", () => {
  test("루비 단위를 한자/가나로 고르는 모든 조합", () => {
    expect(acceptableForms("{私|わたし}は{学生|がくせい}です").sort()).toEqual(
      ["わたしはがくせいです", "わたしは学生です", "私はがくせいです", "私は学生です"].sort(),
    );
  });
  test("루비가 없으면 그대로, 너무 많으면 두 가지만", () => {
    expect(acceptableForms("おはよう")).toEqual(["おはよう"]);
    const many = Array.from({ length: 10 }, () => "{日|ひ}").join("");
    expect(acceptableForms(many)).toHaveLength(2);
  });
});

describe("judgeWriting", () => {
  test("전부 한자 / 전부 가나 / 섞어 쓴 표기 / 문장부호 유무가 모두 정답", () => {
    for (const s of [
      "私は毎朝新聞を読みます。",
      "わたしはまいあさしんぶんをよみます",
      "私は毎朝しんぶんを読みます",
      "私は 毎朝 新聞を 読みます。",
    ]) {
      expect(judgeWriting(s, M).tier, s).toBe("exact");
    }
  });
  test("조사 하나만 틀리면 close, 정답과 가장 가까운 표기를 돌려준다", () => {
    const j = judgeWriting("私が毎朝新聞を読みます", M);
    expect(j.tier).toBe("close");
    expect(j.closest).toContain("私は");
  });
  test("많이 다르면 miss, 짧은 문장은 한 글자 차이도 miss", () => {
    expect(judgeWriting("今日は雨です", M).tier).toBe("miss");
    expect(judgeWriting("ありがとう", "ありがとね").tier).toBe("miss");
  });
});
