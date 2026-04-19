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

describe("i-adj: new forms on 大きい", () => {
  it("大きい → conditional = 大きければ", () => {
    expect(conjugateAdj("大きい", "i_adj", "conditional")).toBe("大きければ");
  });
  it("大きい → polite_negative = 大きくないです", () => {
    expect(conjugateAdj("大きい", "i_adj", "polite_negative")).toBe(
      "大きくないです",
    );
  });
  it("いい → conditional = よければ (irregular stem)", () => {
    expect(conjugateAdj("いい", "i_adj", "conditional")).toBe("よければ");
  });
  it("いい → polite_negative = よくないです (irregular stem)", () => {
    expect(conjugateAdj("いい", "i_adj", "polite_negative")).toBe(
      "よくないです",
    );
  });
});

describe("na-adj: new forms on 好き", () => {
  it("好き → ni_adv = 好きに", () => {
    expect(conjugateAdj("好き", "na_adj", "ni_adv")).toBe("好きに");
  });
  it("好き → conditional = 好きなら", () => {
    expect(conjugateAdj("好き", "na_adj", "conditional")).toBe("好きなら");
  });
  it("好き → polite_negative = 好きじゃありません", () => {
    expect(conjugateAdj("好き", "na_adj", "polite_negative")).toBe(
      "好きじゃありません",
    );
  });
  it("静か → ni_adv = 静かに", () => {
    expect(conjugateAdj("静か", "na_adj", "ni_adv")).toBe("静かに");
  });
  it("元気 → conditional = 元気なら", () => {
    expect(conjugateAdj("元気", "na_adj", "conditional")).toBe("元気なら");
  });
});

describe("conjugateAdjAll — polite_negative alternates", () => {
  it("i-adj polite_negative includes both 〜くないです and 〜くありません", () => {
    const out = conjugateAdjAll("大きい", "おおきい", "i_adj", "polite_negative");
    expect(out).toContain("大きくないです");
    expect(out).toContain("大きくありません");
    expect(out).toContain("おおきくないです");
    expect(out).toContain("おおきくありません");
  });
  it("na-adj polite_negative enumerates all four register×politeness forms", () => {
    const out = conjugateAdjAll("好き", "すき", "na_adj", "polite_negative");
    for (const v of [
      "好きじゃありません",
      "好きじゃないです",
      "好きではありません",
      "好きではないです",
      "すきじゃありません",
      "すきじゃないです",
      "すきではありません",
      "すきではないです",
    ]) {
      expect(out).toContain(v);
    }
  });
  it("na-adj conditional is a clean single pair (no register multiplication)", () => {
    const out = conjugateAdjAll("静か", "しずか", "na_adj", "conditional");
    expect(out.sort()).toEqual(["しずかなら", "静かなら"].sort());
  });
  it("na-adj ni_adv is a clean single pair", () => {
    const out = conjugateAdjAll("元気", "げんき", "na_adj", "ni_adv");
    expect(out.sort()).toEqual(["げんきに", "元気に"].sort());
  });
  it("いい polite_negative alternate does not leak いくありません", () => {
    const out = conjugateAdjAll("いい", "いい", "i_adj", "polite_negative");
    expect(out).toContain("よくないです");
    expect(out).toContain("よくありません");
    expect(out).not.toContain("いくないです");
    expect(out).not.toContain("いくありません");
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
  it("i-adj with ni_adv form throws", () => {
    expect(() => conjugateAdj("大きい", "i_adj", "ni_adv")).toThrow(
      AdjectiveConjugationError,
    );
  });
  it("na-adj with i_adv form throws", () => {
    expect(() => conjugateAdj("好き", "na_adj", "i_adv")).toThrow(
      AdjectiveConjugationError,
    );
  });
});
