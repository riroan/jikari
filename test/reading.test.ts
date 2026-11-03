import { describe, expect, it } from "vitest";
import { orderDeck, readingItems, updateWeak } from "@/lib/reading";
import type { ExpressionCard, SentenceCard } from "@/lib/types";

const sent = (id: string, o: Partial<SentenceCard>) =>
  ({ id, sentence: "＿＿＿を食べる", blank: "りんご", translation: "ko", ...o }) as SentenceCard;
const expr = (id: string, o: Partial<ExpressionCard>) =>
  ({ id, expression_jp: "ありがとう", translation_ko: "ko", ...o }) as ExpressionCard;

describe("readingItems", () => {
  it("keeps only cards with furigana, fills the blank, drops long ones", () => {
    const items = readingItems(
      [
        sent("a", { sentenceRuby: "＿＿＿を{食|た}べる", blankRuby: "{林檎|りんご}" }),
        sent("b", {}), // no ruby
        sent("c", { sentenceRuby: "{私|わたし}は" + "あ".repeat(40) }),
      ],
      [expr("e1", { ruby: "{今日|きょう}は" }), expr("e2", {})],
    );
    expect(items.map((i) => i.id)).toEqual(["a", "e1"]);
    expect(items[0].markup).toBe("{林檎|りんご}を{食|た}べる");
  });
});

describe("orderDeck", () => {
  const ids = ["1", "2", "3", "4", "5", "6"];
  it("puts weak first, keeps every id once, deterministic", () => {
    const weak = new Set(["4", "6"]);
    const d = orderDeck(ids, weak, 7);
    expect(new Set(d.slice(0, 2))).toEqual(weak);
    expect([...d].sort()).toEqual(ids);
    expect(orderDeck(ids, weak, 7)).toEqual(d);
  });
});

describe("updateWeak", () => {
  it("peek or miss marks weak; clean hit clears; input untouched", () => {
    const w = new Set(["x"]);
    expect(updateWeak(w, "y", true, true).has("y")).toBe(true);
    expect(updateWeak(w, "y", false, false).has("y")).toBe(true);
    expect(updateWeak(w, "x", true, false).has("x")).toBe(false);
    expect(updateWeak(w, "x", true, true).has("x")).toBe(true);
    expect(w.has("x")).toBe(true);
  });
});
