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

  it("empty states give zeros", () => {
    expect(forecastDue({}, NOW)).toEqual({ today: 0, tomorrow: 0, week: 0 });
  });

  it("midnight boundaries: 23:59:59.999 is today, 00:00 is tomorrow, day+7 00:00 is out", () => {
    const eod = new Date(2026, 0, 10, 23, 59, 59, 999).getTime();
    const mk = (id: string, t: number) => [id, s(id, t)] as const;
    const states = Object.fromEntries([mk("a", eod), mk("b", eod + 1), mk("c", day(7, 0) - 1), mk("d", day(7, 0))]);
    expect(forecastDue(states, NOW)).toEqual({ today: 1, tomorrow: 1, week: 3 });
  });
});
