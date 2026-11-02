import { describe, it, expect } from "vitest";
import { forecastDue } from "@/lib/forecast";
import type { LearningState } from "@/lib/types";

const NOW = new Date(2026, 0, 10, 15).getTime();
const day = (n: number, h = 9) => new Date(2026, 0, 10 + n, h).getTime();
const s = (id: string, nextDue: number, lastReviewed = 1): LearningState => ({
  cardKey: `vocab:${id}`, mode: "vocab", cardId: id, box: 1, nextDue, correctStreak: 0, lastReviewed,
});

describe("forecastDue", () => {
  it("buckets by local day; overdue counts as today; new cards ignored", () => {
    const states = Object.fromEntries(
      [s("a", day(-3)), s("b", day(0, 23)), s("c", day(1)), s("d", day(6)), s("e", day(7, 0)), s("f", day(0), 0)]
        .map((x) => [x.cardKey + x.cardId, x]),
    );
    expect(forecastDue(states, NOW)).toEqual({ today: 2, tomorrow: 1, week: 4 });
  });
});
