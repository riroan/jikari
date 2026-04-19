import { describe, it, expect } from "vitest";
import {
  conjugateAdj,
  conjugateAdjAll,
  AdjectiveConjugationError,
} from "@/lib/adjective";

describe("i-adj: all 5 forms on 大きい", () => {
  const cases: Array<[string, string]> = [
    ["negative", "大きくない"],
    ["past", "大きかった"],
    ["past_negative", "大きくなかった"],
    ["te", "大きくて"],
    ["i_adv", "大きく"],
  ];
  it.each(cases)("大きい → %s = %s", (form, out) => {
    expect(conjugateAdj("大きい", "i_adj", form as never)).toBe(out);
  });
});

describe("i-adj: all-kana stems", () => {
  it("おおきい → negative = おおきくない", () => {
    expect(conjugateAdj("おおきい", "i_adj", "negative")).toBe("おおきくない");
  });
  it("さむい → past = さむかった", () => {
    expect(conjugateAdj("さむい", "i_adj", "past")).toBe("さむかった");
  });
  it("たのしい → te = たのしくて", () => {
    expect(conjugateAdj("たのしい", "i_adj", "te")).toBe("たのしくて");
  });
});

describe("i-adj: いい irregularity (stem → よ)", () => {
  it("いい → negative = よくない (NOT いくない)", () => {
    expect(conjugateAdj("いい", "i_adj", "negative")).toBe("よくない");
  });
  it("いい → past = よかった", () => {
    expect(conjugateAdj("いい", "i_adj", "past")).toBe("よかった");
  });
  it("いい → past_negative = よくなかった", () => {
    expect(conjugateAdj("いい", "i_adj", "past_negative")).toBe("よくなかった");
  });
  it("いい → te = よくて", () => {
    expect(conjugateAdj("いい", "i_adj", "te")).toBe("よくて");
  });
  it("いい → i_adv = よく", () => {
    expect(conjugateAdj("いい", "i_adj", "i_adv")).toBe("よく");
  });
  it("良い (kanji form) → negative = 良くない via regular stripping", () => {
    expect(conjugateAdj("良い", "i_adj", "negative")).toBe("良くない");
  });
  it("よい (kanji-reading spelling) → negative = よくない", () => {
    expect(conjugateAdj("よい", "i_adj", "negative")).toBe("よくない");
  });
});

describe("na-adj: all 5 forms on 好き", () => {
  const cases: Array<[string, string]> = [
    ["negative", "好きじゃない"],
    ["past", "好きだった"],
    ["past_negative", "好きじゃなかった"],
    ["te", "好きで"],
    ["na_prenominal", "好きな"],
  ];
  it.each(cases)("好き → %s = %s", (form, out) => {
    expect(conjugateAdj("好き", "na_adj", form as never)).toBe(out);
  });
});

describe("na-adj: additional stems", () => {
  it("元気 → negative = 元気じゃない", () => {
    expect(conjugateAdj("元気", "na_adj", "negative")).toBe("元気じゃない");
  });
  it("静か → te = 静かで", () => {
    expect(conjugateAdj("静か", "na_adj", "te")).toBe("静かで");
  });
  it("嫌い → na_prenominal = 嫌いな", () => {
    expect(conjugateAdj("嫌い", "na_adj", "na_prenominal")).toBe("嫌いな");
  });
});

describe("conjugateAdjAll — both registers + orthographies", () => {
  it("i-adj returns both word + reading when they differ", () => {
    const out = conjugateAdjAll("大きい", "おおきい", "i_adj", "past");
    expect(out.sort()).toEqual(["おおきかった", "大きかった"].sort());
  });
  it("i-adj returns single when word === reading", () => {
    const out = conjugateAdjAll("さむい", "さむい", "i_adj", "te");
    expect(out).toEqual(["さむくて"]);
  });
  it("na-adj negative includes both じゃ and では", () => {
    const out = conjugateAdjAll("好き", "すき", "na_adj", "negative");
    expect(out.sort()).toEqual(
      ["好きじゃない", "好きではない", "すきじゃない", "すきではない"].sort(),
    );
  });
  it("na-adj past_negative includes both registers", () => {
    const out = conjugateAdjAll("元気", "げんき", "na_adj", "past_negative");
    expect(out).toContain("元気じゃなかった");
    expect(out).toContain("元気ではなかった");
    expect(out).toContain("げんきじゃなかった");
    expect(out).toContain("げんきではなかった");
  });
  it("na-adj past does NOT duplicate with register (no じゃ/では involved)", () => {
    const out = conjugateAdjAll("好き", "すき", "na_adj", "past");
    expect(out.sort()).toEqual(["好きだった", "すきだった"].sort());
  });
  it("i-adj irregularity applies to both word and reading when stem is いい", () => {
    const out = conjugateAdjAll("いい", "いい", "i_adj", "negative");
    expect(out).toEqual(["よくない"]);
  });
});

describe("conjugateAdj — invalid inputs", () => {
  it("empty stem throws", () => {
    expect(() => conjugateAdj("", "i_adj", "negative")).toThrow(
      AdjectiveConjugationError,
    );
  });
  it("not_adj group throws", () => {
    expect(() => conjugateAdj("パン", "not_adj", "negative")).toThrow(
      AdjectiveConjugationError,
    );
  });
  it("i-adj stem not ending in い throws", () => {
    expect(() => conjugateAdj("好き", "i_adj", "negative")).toThrow(
      AdjectiveConjugationError,
    );
  });
  it("i-adj with na_prenominal form throws", () => {
    expect(() => conjugateAdj("大きい", "i_adj", "na_prenominal")).toThrow(
      AdjectiveConjugationError,
    );
  });
  it("na-adj with i_adv form throws", () => {
    expect(() => conjugateAdj("好き", "na_adj", "i_adv")).toThrow(
      AdjectiveConjugationError,
    );
  });
});
