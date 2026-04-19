import { describe, it, expect } from "vitest";
import {
  conjugate,
  conjugateAll,
  ConjugationError,
} from "@/lib/conjugation";

describe("conjugate — godan: masu/te/ta for every tail char", () => {
  const cases: Array<
    [stem: string, masu: string, te: string, ta: string]
  > = [
    ["買う", "買います", "買って", "買った"],
    ["書く", "書きます", "書いて", "書いた"],
    ["泳ぐ", "泳ぎます", "泳いで", "泳いだ"],
    ["話す", "話します", "話して", "話した"],
    ["待つ", "待ちます", "待って", "待った"],
    ["死ぬ", "死にます", "死んで", "死んだ"],
    ["遊ぶ", "遊びます", "遊んで", "遊んだ"],
    ["読む", "読みます", "読んで", "読んだ"],
    ["乗る", "乗ります", "乗って", "乗った"],
  ];
  it.each(cases)("%s → masu", (stem, masu) => {
    expect(conjugate(stem, "godan", "masu")).toBe(masu);
  });
  it.each(cases)("%s → te", (stem, _, te) => {
    expect(conjugate(stem, "godan", "te")).toBe(te);
  });
  it.each(cases)("%s → ta", (stem, _, __, ta) => {
    expect(conjugate(stem, "godan", "ta")).toBe(ta);
  });
});

describe("conjugate — godan: secondary forms", () => {
  it("買う → nai (う→わ special case, not 買あない)", () => {
    expect(conjugate("買う", "godan", "nai")).toBe("買わない");
  });
  it("読む → nai", () => {
    expect(conjugate("読む", "godan", "nai")).toBe("読まない");
  });
  it("買う → potential", () => {
    expect(conjugate("買う", "godan", "potential")).toBe("買える");
  });
  it("読む → potential", () => {
    expect(conjugate("読む", "godan", "potential")).toBe("読める");
  });
  it("買う → volitional", () => {
    expect(conjugate("買う", "godan", "volitional")).toBe("買おう");
  });
  it("書く → volitional", () => {
    expect(conjugate("書く", "godan", "volitional")).toBe("書こう");
  });
  it("買う → imperative", () => {
    expect(conjugate("買う", "godan", "imperative")).toBe("買え");
  });
  it("話す → imperative", () => {
    expect(conjugate("話す", "godan", "imperative")).toBe("話せ");
  });
  it("買う → causative (わ + せる)", () => {
    expect(conjugate("買う", "godan", "causative")).toBe("買わせる");
  });
  it("書く → causative", () => {
    expect(conjugate("書く", "godan", "causative")).toBe("書かせる");
  });
  it("買う → passive (わ + れる)", () => {
    expect(conjugate("買う", "godan", "passive")).toBe("買われる");
  });
  it("読む → passive", () => {
    expect(conjugate("読む", "godan", "passive")).toBe("読まれる");
  });
  it("買う → conditional (ば)", () => {
    expect(conjugate("買う", "godan", "conditional")).toBe("買えば");
  });
  it("書く → conditional", () => {
    expect(conjugate("書く", "godan", "conditional")).toBe("書けば");
  });
});

describe("conjugate — ichidan: all 10 forms on 食べる", () => {
  const expected: Record<string, string> = {
    masu: "食べます",
    te: "食べて",
    ta: "食べた",
    nai: "食べない",
    potential: "食べられる",
    volitional: "食べよう",
    imperative: "食べろ",
    causative: "食べさせる",
    passive: "食べられる",
    conditional: "食べれば",
  };
  for (const [form, out] of Object.entries(expected)) {
    it(`食べる → ${form} = ${out}`, () => {
      expect(conjugate("食べる", "ichidan", form as never)).toBe(out);
    });
  }
});

describe("conjugate — ichidan: 見る (short stem edge case)", () => {
  it("見る → masu", () => {
    expect(conjugate("見る", "ichidan", "masu")).toBe("見ます");
  });
  it("見る → te", () => {
    expect(conjugate("見る", "ichidan", "te")).toBe("見て");
  });
  it("見る → potential", () => {
    expect(conjugate("見る", "ichidan", "potential")).toBe("見られる");
  });
});

describe("conjugate — irregular: する all 10 forms", () => {
  const expected: Record<string, string> = {
    masu: "します",
    te: "して",
    ta: "した",
    nai: "しない",
    potential: "できる",
    volitional: "しよう",
    imperative: "しろ",
    causative: "させる",
    passive: "される",
    conditional: "すれば",
  };
  for (const [form, out] of Object.entries(expected)) {
    it(`する → ${form} = ${out}`, () => {
      expect(conjugate("する", "irregular", form as never)).toBe(out);
    });
  }
});

describe("conjugate — irregular: 来る (kanji) all 10 forms", () => {
  const expected: Record<string, string> = {
    masu: "来ます",
    te: "来て",
    ta: "来た",
    nai: "来ない",
    potential: "来られる",
    volitional: "来よう",
    imperative: "来い",
    causative: "来させる",
    passive: "来られる",
    conditional: "来れば",
  };
  for (const [form, out] of Object.entries(expected)) {
    it(`来る → ${form} = ${out}`, () => {
      expect(conjugate("来る", "irregular", form as never)).toBe(out);
    });
  }
});

describe("conjugate — irregular: くる (kana) all 10 forms", () => {
  const expected: Record<string, string> = {
    masu: "きます",
    te: "きて",
    ta: "きた",
    nai: "こない",
    potential: "こられる",
    volitional: "こよう",
    imperative: "こい",
    causative: "こさせる",
    passive: "こられる",
    conditional: "くれば",
  };
  for (const [form, out] of Object.entries(expected)) {
    it(`くる → ${form} = ${out}`, () => {
      expect(conjugate("くる", "irregular", form as never)).toBe(out);
    });
  }
});

describe("conjugate — suffix compounds (する / 来る)", () => {
  it("勉強する → masu (prefix preserved)", () => {
    expect(conjugate("勉強する", "irregular", "masu")).toBe("勉強します");
  });
  it("勉強する → te", () => {
    expect(conjugate("勉強する", "irregular", "te")).toBe("勉強して");
  });
  it("勉強する → nai", () => {
    expect(conjugate("勉強する", "irregular", "nai")).toBe("勉強しない");
  });
  it("結婚する → ta", () => {
    expect(conjugate("結婚する", "irregular", "ta")).toBe("結婚した");
  });
  it("電話する → potential (can be done)", () => {
    expect(conjugate("電話する", "irregular", "potential")).toBe("電話できる");
  });
  it("べんきょうする (kana) → masu", () => {
    expect(conjugate("べんきょうする", "irregular", "masu")).toBe(
      "べんきょうします",
    );
  });
  it("持って来る → masu", () => {
    expect(conjugate("持って来る", "irregular", "masu")).toBe("持って来ます");
  });
  it("もってくる (kana) → ta", () => {
    expect(conjugate("もってくる", "irregular", "ta")).toBe("もってきた");
  });
});

describe("conjugate — VERB_EXCEPTIONS", () => {
  it("行く → te = 行って (exception, NOT 行いて)", () => {
    expect(conjugate("行く", "godan", "te")).toBe("行って");
  });
  it("行く → ta = 行った", () => {
    expect(conjugate("行く", "godan", "ta")).toBe("行った");
  });
  it("いく (kana) → te = いって", () => {
    expect(conjugate("いく", "godan", "te")).toBe("いって");
  });
  it("いく → ta = いった", () => {
    expect(conjugate("いく", "godan", "ta")).toBe("いった");
  });
  it("行く → masu falls through to regular godan (行きます)", () => {
    expect(conjugate("行く", "godan", "masu")).toBe("行きます");
  });
  it("行く → nai falls through (行かない)", () => {
    expect(conjugate("行く", "godan", "nai")).toBe("行かない");
  });
  it("問う → te = 問うて (u-verb exception, NOT 問って)", () => {
    expect(conjugate("問う", "godan", "te")).toBe("問うて");
  });
  it("問う → ta = 問うた", () => {
    expect(conjugate("問う", "godan", "ta")).toBe("問うた");
  });
});

describe("conjugate — kana stems (reading-form conjugation)", () => {
  it("たべる (ichidan, all kana) → masu = たべます", () => {
    expect(conjugate("たべる", "ichidan", "masu")).toBe("たべます");
  });
  it("かう (godan, all kana) → te = かって", () => {
    expect(conjugate("かう", "godan", "te")).toBe("かって");
  });
  it("よむ (godan, all kana) → nai = よまない", () => {
    expect(conjugate("よむ", "godan", "nai")).toBe("よまない");
  });
});

describe("conjugateAll — dedupe + both representations", () => {
  it("returns both when word and reading differ", () => {
    const out = conjugateAll("食べる", "たべる", "ichidan", "ta");
    expect(out.sort()).toEqual(["たべた", "食べた"].sort());
  });
  it("returns single when word === reading (all kana verb)", () => {
    const out = conjugateAll("かう", "かう", "godan", "masu");
    expect(out).toEqual(["かいます"]);
  });
  it("exception applies to both word and reading variants", () => {
    const out = conjugateAll("行く", "いく", "godan", "te");
    expect(out.sort()).toEqual(["いって", "行って"].sort());
  });
});

describe("conjugate — invalid inputs throw ConjugationError", () => {
  it("empty stem throws", () => {
    expect(() => conjugate("", "godan", "masu")).toThrow(ConjugationError);
  });
  it("not_verb group throws", () => {
    expect(() => conjugate("パン", "not_verb", "masu")).toThrow(
      ConjugationError,
    );
  });
  it("godan with non-godan tail throws", () => {
    // 'え' is not a valid godan tail
    expect(() => conjugate("見え", "godan", "masu")).toThrow(ConjugationError);
  });
  it("ichidan without る throws", () => {
    expect(() => conjugate("食べ", "ichidan", "masu")).toThrow(
      ConjugationError,
    );
  });
  it("irregular with unknown verb throws", () => {
    expect(() => conjugate("歩く", "irregular", "masu")).toThrow(
      ConjugationError,
    );
  });
});
