import { describe, expect, it } from "vitest";
import { checkDictation, dictationReading } from "@/lib/dictation";

describe("dictationReading", () => {
  it("builds kana from furigana markup and drops punctuation/spaces", () => {
    expect(dictationReading("{お疲|つか}れ{様|さま}でした。")).toBe("おつかれさまでした");
    expect(dictationReading("ありがとう、ございます！")).toBe("ありがとうございます");
  });
  it("returns null when kanji has no reading", () => {
    expect(dictationReading("お疲れ様")).toBeNull();
  });
});

describe("checkDictation", () => {
  const r = "いってきます";
  it("ignores punctuation and spaces", () => {
    expect(checkDictation("いって、きます。 ", r).correct).toBe(true);
    expect(checkDictation("いってきます", "いって、きます！").correct).toBe(true);
  });
  it("accepts katakana for hiragana", () => {
    expect(checkDictation("イッテキマス", r).correct).toBe(true);
  });
  it("distinguishes small tsu", () => {
    expect(checkDictation("いてきます", r).correct).toBe(false);
    expect(checkDictation("いつてきます", r).correct).toBe(false);
  });
  it("treats ー and written-out vowels alike", () => {
    expect(checkDictation("こーひー", "こーひー").correct).toBe(true);
    expect(checkDictation("コーヒー", "こーひー").correct).toBe(true);
    expect(checkDictation("こうひい", "こーひー").correct).toBe(true);
  });
  it("marks missed chars", () => {
    const { correct, diff } = checkDictation("いってます", r);
    expect(correct).toBe(false);
    expect(diff.filter((d) => !d.ok).map((d) => d.ch)).toEqual(["き"]);
  });
  it("empty input is wrong", () => {
    expect(checkDictation("、。", r).correct).toBe(false);
  });
});
