import { describe, expect, test } from "vitest";
import {
  normalizeJapanese,
  normalizeKorean,
  matchesAnyAnswer,
} from "@/lib/normalize";

describe("normalizeJapanese", () => {
  test("hiragana passes through unchanged", () => {
    expect(normalizeJapanese("にち")).toBe("にち");
  });

  test("katakana → hiragana", () => {
    expect(normalizeJapanese("ニチ")).toBe("にち");
  });

  test("romaji → hiragana", () => {
    expect(normalizeJapanese("nichi")).toBe("にち");
  });

  test("trims leading/trailing whitespace", () => {
    expect(normalizeJapanese("  にち  ")).toBe("にち");
    expect(normalizeJapanese("\tにち\n")).toBe("にち");
  });

  test("NFC normalization — composed vs decomposed", () => {
    // が (composed U+304C) vs が (か + ゛, U+304B + U+3099)
    const composed = "\u304C";
    const decomposed = "\u304B\u3099";
    expect(normalizeJapanese(composed)).toBe(normalizeJapanese(decomposed));
  });

  test("mixed romaji + kana", () => {
    expect(normalizeJapanese("jiにち")).toBe("じにち");
  });

  test("empty input", () => {
    expect(normalizeJapanese("")).toBe("");
    expect(normalizeJapanese("   ")).toBe("");
  });

  test("long-vowel katakana preserved via ー → ー or expansion", () => {
    // ラーメン → らーめん (wanakana keeps prolonged mark)
    expect(normalizeJapanese("ラーメン")).toMatch(/ら.めん/);
  });

  test("capitalization-insensitive romaji", () => {
    expect(normalizeJapanese("NICHI")).toBe(normalizeJapanese("nichi"));
  });
});

describe("normalizeKorean", () => {
  test("passes through simple text", () => {
    expect(normalizeKorean("먹다")).toBe("먹다");
  });

  test("trims whitespace", () => {
    expect(normalizeKorean("  먹다  ")).toBe("먹다");
  });

  test("collapses inner whitespace", () => {
    expect(normalizeKorean("날  해")).toBe("날 해");
    expect(normalizeKorean("날\t\t해")).toBe("날 해");
  });

  test("strips surrounding punctuation", () => {
    expect(normalizeKorean("먹다.")).toBe("먹다");
    expect(normalizeKorean(".먹다")).toBe("먹다");
    expect(normalizeKorean(",,먹다!!")).toBe("먹다");
  });

  test("keeps inner punctuation", () => {
    expect(normalizeKorean("날·해")).toBe("날·해");
  });

  test("does not alter stem forms (먹는다 ≠ 먹다)", () => {
    expect(normalizeKorean("먹는다")).not.toBe(normalizeKorean("먹다"));
  });

  test("NFC normalizes composed hangul", () => {
    // 가 (U+AC00) — already composed; decomposed would be ㄱ+ㅏ
    const composed = "\uAC00";
    const decomposed = "\u1100\u1161";
    expect(normalizeKorean(composed)).toBe(normalizeKorean(decomposed));
  });

  test("empty input returns empty", () => {
    expect(normalizeKorean("")).toBe("");
    expect(normalizeKorean("   ")).toBe("");
  });
});

describe("matchesAnyAnswer", () => {
  test("matches first candidate", () => {
    expect(
      matchesAnyAnswer("nichi", ["にち", "じつ"], normalizeJapanese),
    ).toBe(true);
  });

  test("matches second candidate", () => {
    expect(
      matchesAnyAnswer("jitsu", ["にち", "じつ"], normalizeJapanese),
    ).toBe(true);
  });

  test("returns false for non-match", () => {
    expect(
      matchesAnyAnswer("bogus", ["にち", "じつ"], normalizeJapanese),
    ).toBe(false);
  });

  test("empty input never matches", () => {
    expect(
      matchesAnyAnswer("", ["にち"], normalizeJapanese),
    ).toBe(false);
    expect(
      matchesAnyAnswer("   ", ["にち"], normalizeJapanese),
    ).toBe(false);
  });

  test("Korean with different punctuation still matches", () => {
    expect(
      matchesAnyAnswer("먹다.", ["먹다"], normalizeKorean),
    ).toBe(true);
  });
});
