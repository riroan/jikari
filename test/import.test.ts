import { describe, it, expect } from "vitest";
import { parseBackup } from "@/lib/import";
import type { PersistedState } from "@/lib/types";
import { SCHEMA_VERSION } from "@/lib/types";

const validState: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  learningStates: {
    "kanji:日": {
      cardKey: "kanji:日",
      mode: "kanji",
      cardId: "日",
      box: 2,
      nextDue: 1700000000000,
      correctStreak: 1,
      lastReviewed: 1699913600000,
    },
  },
  heatmap: { "2026-04-17": 5 },
  lastActiveAt: 1700000000000,
  currentStreak: 3,
  settings: {
    theme: "light",
    dailyNewLimit: 20,
    dailyReviewLimit: 50,
  },
};

describe("parseBackup", () => {
  it("accepts a valid backup", () => {
    const result = parseBackup(JSON.stringify(validState));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  it("rejects invalid JSON", () => {
    const result = parseBackup("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("JSON parse failed");
    }
  });

  it("rejects missing required fields", () => {
    const incomplete = { schemaVersion: 1 };
    const result = parseBackup(JSON.stringify(incomplete));
    expect(result.ok).toBe(false);
  });

  it("rejects invalid box value", () => {
    const bad = {
      ...validState,
      learningStates: {
        "kanji:日": {
          ...validState.learningStates["kanji:日"],
          box: 7, // out of range
        },
      },
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("rejects invalid heatmap key format", () => {
    const bad = {
      ...validState,
      heatmap: { "not-a-date": 5 },
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("rejects negative counts", () => {
    const bad = {
      ...validState,
      heatmap: { "2026-04-17": -1 },
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("rejects unknown mode", () => {
    const bad = {
      ...validState,
      learningStates: {
        "weird:日": {
          cardKey: "weird:日",
          mode: "weird",
          cardId: "日",
          box: 1,
          nextDue: 0,
          correctStreak: 0,
          lastReviewed: 0,
        },
      },
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });

  it("rejects backup with newer schema than app", () => {
    const future = { ...validState, schemaVersion: 999 };
    const result = parseBackup(JSON.stringify(future));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("newer than app");
    }
  });

  it("accepts backup with theme dark", () => {
    const dark = { ...validState, settings: { ...validState.settings, theme: "dark" as const } };
    const result = parseBackup(JSON.stringify(dark));
    expect(result.ok).toBe(true);
  });

  it("rejects dailyReviewLimit over max", () => {
    const bad = {
      ...validState,
      settings: { ...validState.settings, dailyReviewLimit: 10000 },
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
  });
});
