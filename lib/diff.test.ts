import { describe, expect, it } from "vitest";
import { closestAnswer, diffAgainst } from "./diff";

describe("diffAgainst", () => {
  it("marks missing/wrong chars of the correct answer", () => {
    const d = diffAgainst("たべます", "たべません");
    expect(d.map((x) => x.ok)).toEqual([true, true, true, false, false]);
  });
  it("normalizes romaji/katakana", () => {
    expect(diffAgainst("タベル", "たべる").every((x) => x.ok)).toBe(true);
  });
  it("empty input marks everything wrong", () => {
    expect(diffAgainst("", "たべる").every((x) => !x.ok)).toBe(true);
  });
});

describe("closestAnswer", () => {
  it("picks the candidate sharing most chars", () => {
    expect(closestAnswer("みられる", ["みれる", "みられる"])).toBe("みられる");
  });
});
