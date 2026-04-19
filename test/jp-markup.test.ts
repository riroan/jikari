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
