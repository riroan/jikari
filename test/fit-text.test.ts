import { describe, expect, test } from "vitest";
import { fitFontSize } from "@/lib/fit-text";

describe("fitFontSize", () => {
  test("caps at maxPx and divides the container width by ~1.02em per char", () => {
    expect(fitFontSize(96, "間違える")).toBe("min(96px, calc(100cqi / 4.08))");
  });
  test("counts code points, not UTF-16 units", () => {
    expect(fitFontSize(34, "〜𠮟る")).toBe("min(34px, calc(100cqi / 3.06))");
  });
  test("minPx adds a floor", () => {
    expect(fitFontSize(34, "〜なければならない", 22)).toBe("max(22px, min(34px, calc(100cqi / 9.18)))");
  });
});
