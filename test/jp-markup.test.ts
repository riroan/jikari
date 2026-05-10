import { describe, expect, test, vi, beforeEach } from "vitest";
import { parseMarkup, stripMarkup, type Segment } from "@/lib/jp-markup";

const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  warnSpy.mockClear();
});

describe("parseMarkup — basic", () => {
  test("empty string returns []", () => {
    expect(parseMarkup("")).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("plain text returns single text segment", () => {
    expect(parseMarkup("hello world")).toEqual([
      { kind: "text", text: "hello world" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("single ruby", () => {
    expect(parseMarkup("{漢字|かんじ}")).toEqual([
      { kind: "ruby", base: "漢字", furigana: "かんじ" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("single highlight wrapping text", () => {
    expect(parseMarkup("[[〜なければならない]]")).toEqual([
      {
        kind: "highlight",
        children: [{ kind: "text", text: "〜なければならない" }],
      },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("highlight containing ruby", () => {
    expect(parseMarkup("[[{食|た}べなければ]]ならない")).toEqual([
      {
        kind: "highlight",
        children: [
          { kind: "ruby", base: "食", furigana: "た" },
          { kind: "text", text: "べなければ" },
        ],
      },
      { kind: "text", text: "ならない" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("multiple segments mixed (text, ruby, highlight)", () => {
    const out = parseMarkup("明日までに[[{食|た}べなければ]]いけない");
    expect(out).toEqual<Segment[]>([
      { kind: "text", text: "明日までに" },
      {
        kind: "highlight",
        children: [
          { kind: "ruby", base: "食", furigana: "た" },
          { kind: "text", text: "べなければ" },
        ],
      },
      { kind: "text", text: "いけない" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("multiple rubies in one string", () => {
    expect(parseMarkup("{私|わたし}は{学生|がくせい}です")).toEqual<Segment[]>([
      { kind: "ruby", base: "私", furigana: "わたし" },
      { kind: "text", text: "は" },
      { kind: "ruby", base: "学生", furigana: "がくせい" },
      { kind: "text", text: "です" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("parseMarkup — malformed input (fallback + warn)", () => {
  test("unclosed ruby — strips `{` literal", () => {
    expect(parseMarkup("prefix {no close suffix")).toEqual([
      { kind: "text", text: "prefix no close suffix" },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("unclosed highlight — strips `[[` literal", () => {
    expect(parseMarkup("prefix [[no close suffix")).toEqual([
      { kind: "text", text: "prefix no close suffix" },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("nested highlight — outer kept, inner brackets stripped", () => {
    const out = parseMarkup("[[outer [[inner]] end]]");
    expect(out).toEqual<Segment[]>([
      {
        kind: "highlight",
        children: [{ kind: "text", text: "outer inner end" }],
      },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("stray `}` stripped with warning", () => {
    expect(parseMarkup("stray } here")).toEqual([
      { kind: "text", text: "stray  here" },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("stray `]]` stripped with warning", () => {
    expect(parseMarkup("stray ]] here")).toEqual([
      { kind: "text", text: "stray  here" },
    ]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test("ruby with empty base is stripped (braces + pipe removed)", () => {
    expect(parseMarkup("{|x}test")).toEqual([
      { kind: "text", text: "xtest" },
    ]);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("parseMarkup — adjacent / nested edge cases", () => {
  test("two highlights back-to-back stay separate", () => {
    expect(parseMarkup("[[a]][[b]]")).toEqual<Segment[]>([
      { kind: "highlight", children: [{ kind: "text", text: "a" }] },
      { kind: "highlight", children: [{ kind: "text", text: "b" }] },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("highlight directly followed by ruby", () => {
    expect(parseMarkup("[[x]]{食|た}")).toEqual<Segment[]>([
      { kind: "highlight", children: [{ kind: "text", text: "x" }] },
      { kind: "ruby", base: "食", furigana: "た" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("ruby directly followed by highlight", () => {
    expect(parseMarkup("{食|た}[[べる]]")).toEqual<Segment[]>([
      { kind: "ruby", base: "食", furigana: "た" },
      { kind: "highlight", children: [{ kind: "text", text: "べる" }] },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("two adjacent rubies merge surrounding text correctly", () => {
    expect(parseMarkup("{私|わたし}{学生|がくせい}")).toEqual<Segment[]>([
      { kind: "ruby", base: "私", furigana: "わたし" },
      { kind: "ruby", base: "学生", furigana: "がくせい" },
    ]);
  });

  test("text fragments around a ruby stay merged across the boundary", () => {
    // Implementation detail: parser pushes text before the ruby and after as
    // separate spans; mergeAdjacentText collapses them when no inline markup
    // splits them. Here a ruby is in the middle so we expect 3 segments.
    const out = parseMarkup("ab{x|y}cd");
    expect(out).toEqual<Segment[]>([
      { kind: "text", text: "ab" },
      { kind: "ruby", base: "x", furigana: "y" },
      { kind: "text", text: "cd" },
    ]);
  });

  test("stray `{` before a valid ruby strips the outer brace, keeps the inner ruby", () => {
    // `findMatchingBrace` short-circuits on the stray `{`, so the outer
    // brace at index 0 is dropped (with a warning). Parsing then resumes
    // at the inner `{b|c}` which is a valid ruby.
    const out = parseMarkup("{a{b|c}d");
    expect(stripMarkup(out)).toBe("abd");
    expect(warnSpy).toHaveBeenCalled();
  });

  test("ruby with empty furigana is stripped", () => {
    expect(parseMarkup("{x|}post")).toEqual<Segment[]>([
      { kind: "text", text: "xpost" },
    ]);
    expect(warnSpy).toHaveBeenCalled();
  });

  test("empty highlight `[[]]` collapses to an empty highlight segment", () => {
    expect(parseMarkup("[[]]end")).toEqual<Segment[]>([
      { kind: "highlight", children: [] },
      { kind: "text", text: "end" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test("complex grammar example: prefix + highlight(ruby+text) + suffix", () => {
    const out = parseMarkup("もう[[{食|た}べた]]の?");
    expect(out).toEqual<Segment[]>([
      { kind: "text", text: "もう" },
      {
        kind: "highlight",
        children: [
          { kind: "ruby", base: "食", furigana: "た" },
          { kind: "text", text: "べた" },
        ],
      },
      { kind: "text", text: "の?" },
    ]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe("stripMarkup", () => {
  test("plain text round-trip", () => {
    const segs = parseMarkup("hello");
    expect(stripMarkup(segs)).toBe("hello");
  });

  test("ruby → base only", () => {
    const segs = parseMarkup("{漢字|かんじ}");
    expect(stripMarkup(segs)).toBe("漢字");
  });

  test("highlight → children unwrapped", () => {
    const segs = parseMarkup("[[{食|た}べなければ]]ならない");
    expect(stripMarkup(segs)).toBe("食べなければならない");
  });
});
