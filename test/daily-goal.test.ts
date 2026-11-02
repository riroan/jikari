import { describe, expect, it } from "vitest";
import { normalizeDailyGoal } from "@/lib/daily-goal";
import { parseBackup } from "@/lib/import";
import { DEFAULT_SETTINGS } from "@/lib/types";

describe("normalizeDailyGoal", () => {
  it("keeps allowed values", () => {
    for (const n of [10, 20, 30, 50, 100]) expect(normalizeDailyGoal(n)).toBe(n);
  });
  it("falls back to 20 for missing/invalid", () => {
    for (const v of [undefined, null, 0, 15, "30", NaN]) expect(normalizeDailyGoal(v)).toBe(20);
  });
  it("default setting is 20", () => {
    expect(DEFAULT_SETTINGS.dailyGoal).toBe(20);
  });
});

describe("old backups without dailyGoal", () => {
  it("import pads dailyGoal=20", () => {
    const r = parseBackup(
      JSON.stringify({
        schemaVersion: 6, learningStates: {}, heatmap: {}, lastActiveAt: 0,
        currentStreak: 0, settings: { theme: "dark", showFurigana: true, typingThresholdBox: 4 },
      }),
    );
    expect(r.ok && r.state.settings.dailyGoal).toBe(20);
  });
});
