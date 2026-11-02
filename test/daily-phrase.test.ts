import { describe, expect, it } from "vitest";
import { pickDailyPhrase } from "@/lib/daily-phrase";
import type { ExpressionCard } from "@/lib/types";

const cards: ExpressionCard[] = Array.from({ length: 7 }, (_, i) => ({
  id: `e${i}`,
  situation_ko: "",
  expression_jp: `x${i}`,
  register: "polite",
  translation_ko: "",
}));

describe("pickDailyPhrase", () => {
  it("is empty-safe and deterministic", () => {
    expect(pickDailyPhrase([], "2026-11-02")).toBeNull();
    expect(pickDailyPhrase(cards, "2026-11-02")).toBe(pickDailyPhrase(cards, "2026-11-02"));
  });
  it("never repeats yesterday across month/year boundaries", () => {
    const keys = ["2026-02-28", "2026-03-01", "2026-12-31", "2027-01-01"];
    for (let d = 1; d <= 28; d++) keys.push(`2026-11-${String(d).padStart(2, "0")}`);
    for (let k = 1; k < keys.length; k++) {
      if (k > 4) expect(pickDailyPhrase(cards, keys[k])).not.toBe(pickDailyPhrase(cards, keys[k - 1]));
    }
    expect(pickDailyPhrase(cards, "2026-03-01")).not.toBe(pickDailyPhrase(cards, "2026-02-28"));
    expect(pickDailyPhrase(cards, "2027-01-01")).not.toBe(pickDailyPhrase(cards, "2026-12-31"));
  });
});
