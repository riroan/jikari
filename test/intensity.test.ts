import { describe, it, expect } from "vitest";
import { intensityBg, ratioToIntensity } from "@/lib/intensity";

describe("intensityBg", () => {
  it("level 0 returns subtle inactive background (no accent)", () => {
    expect(intensityBg(0)).toBe("rgba(26, 25, 21, 0.06)");
  });

  it("levels 1–3 use color-mix with --accent-progress at increasing alpha", () => {
    expect(intensityBg(1)).toContain("28%");
    expect(intensityBg(2)).toContain("50%");
    expect(intensityBg(3)).toContain("75%");
    for (const lvl of [1, 2, 3] as const) {
      expect(intensityBg(lvl)).toContain("var(--accent-progress)");
      expect(intensityBg(lvl)).toContain("color-mix");
    }
  });

  it("level 4 uses solid --accent-progress (no transparency)", () => {
    expect(intensityBg(4)).toBe("var(--accent-progress)");
  });
});

describe("ratioToIntensity", () => {
  it("zero or near-zero ratios → level 0", () => {
    expect(ratioToIntensity(0)).toBe(0);
    expect(ratioToIntensity(0.04)).toBe(0);
    expect(ratioToIntensity(0.05)).toBe(0); // boundary inclusive of 0
  });

  it("low mastery (5–30%) → level 1", () => {
    expect(ratioToIntensity(0.06)).toBe(1);
    expect(ratioToIntensity(0.20)).toBe(1);
    expect(ratioToIntensity(0.299)).toBe(1);
  });

  it("mid mastery (30–55%) → level 2", () => {
    expect(ratioToIntensity(0.30)).toBe(2);
    expect(ratioToIntensity(0.50)).toBe(2);
    expect(ratioToIntensity(0.549)).toBe(2);
  });

  it("high mastery (55–80%) → level 3", () => {
    expect(ratioToIntensity(0.55)).toBe(3);
    expect(ratioToIntensity(0.70)).toBe(3);
    expect(ratioToIntensity(0.799)).toBe(3);
  });

  it("mastered (≥80%) → level 4", () => {
    expect(ratioToIntensity(0.80)).toBe(4);
    expect(ratioToIntensity(0.95)).toBe(4);
    expect(ratioToIntensity(1.0)).toBe(4);
  });

  it("non-finite or negative inputs degrade gracefully to 0", () => {
    expect(ratioToIntensity(NaN)).toBe(0);
    expect(ratioToIntensity(-0.1)).toBe(0);
    expect(ratioToIntensity(Infinity)).toBe(0);
  });
});
