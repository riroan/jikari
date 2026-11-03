import { describe, expect, it } from "vitest";
import { buildHint, hintAnswer } from "@/lib/hint";

describe("buildHint", () => {
  it("level 1 shows first kana, rest underscores (length preserved)", () => {
    expect(buildHint("たべる", 1)).toBe("た＿＿");
    expect(buildHint("たべました", 1)).toBe("た＿＿＿＿");
    expect(Array.from(buildHint("たべました", 1))).toHaveLength(5);
  });
  it("level 2 shows first half (rounded up)", () => {
    expect(buildHint("たべました", 2)).toBe("たべま＿＿");
    expect(buildHint("たべる", 2)).toBe("たべ＿");
  });
  it("level 0 hides everything", () => {
    expect(buildHint("たべる", 0)).toBe("＿＿＿");
  });
  it("2-char answers never reveal the whole answer", () => {
    expect(buildHint("あめ", 1)).toBe("あ＿");
    expect(buildHint("あめ", 2)).toBe("あ＿");
  });
  it("1-char answer", () => {
    expect(buildHint("き", 1)).toBe("き");
  });
  it("ん, ー, っ count as one char each", () => {
    expect(buildHint("ほん", 1)).toBe("ほ＿");
    expect(buildHint("こーひー", 2)).toBe("こー＿＿");
    expect(buildHint("がっこう", 1)).toBe("が＿＿＿");
  });
  it("small kana stay attached to the preceding char", () => {
    expect(buildHint("きょう", 1)).toBe("きょ＿");
    expect(buildHint("ちゃいろ", 2)).toBe("ちゃ＿＿");
    expect(buildHint("きょうしつ", 2)).toBe("きょう＿＿");
  });
});

describe("hintAnswer", () => {
  it("uses the first kana-form answer", () => {
    expect(hintAnswer(["食べる", "たべる"])).toBe("たべる");
    expect(hintAnswer(["たべる", "たべます"])).toBe("たべる");
  });
  it("kanji-only answers use the reading", () => {
    expect(hintAnswer(["学校"], "がっこう")).toBe("がっこう");
  });
  it("falls back to first answer (Korean) or null", () => {
    expect(hintAnswer(["학교", "배움터"])).toBe("학교");
    expect(hintAnswer([])).toBeNull();
  });
});
