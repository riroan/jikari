import { describe, it, expect } from "vitest";
import {
  toLocalDateKey,
  incrementToday,
  intensity,
  generateCells,
  currentStreak,
  daysStudiedInLast,
  daysSinceLastStudy,
} from "@/lib/heatmap";

const NOW = new Date(2026, 3, 17, 14, 30, 0).getTime(); // April 17 2026, 2:30 PM local

describe("toLocalDateKey", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(toLocalDateKey(NOW)).toBe("2026-04-17");
  });

  it("pads single-digit month and day", () => {
    const jan5 = new Date(2026, 0, 5, 12).getTime();
    expect(toLocalDateKey(jan5)).toBe("2026-01-05");
  });

  it("respects local timezone (midnight boundary is local, not UTC)", () => {
    // Midnight local on 2026-04-17 — should still be 2026-04-17 regardless of UTC offset
    const midnight = new Date(2026, 3, 17, 0, 0, 0).getTime();
    expect(toLocalDateKey(midnight)).toBe("2026-04-17");
  });
});

describe("incrementToday", () => {
  it("increments today's counter", () => {
    const next = incrementToday({}, NOW);
    expect(next["2026-04-17"]).toBe(1);
  });

  it("increments existing count", () => {
    const next = incrementToday({ "2026-04-17": 5 }, NOW);
    expect(next["2026-04-17"]).toBe(6);
  });

  it("does not mutate other day counts", () => {
    const initial = { "2026-04-16": 3 };
    const next = incrementToday(initial, NOW);
    expect(next["2026-04-16"]).toBe(3);
    expect(next["2026-04-17"]).toBe(1);
  });
});

describe("intensity buckets", () => {
  it("0 → 0", () => expect(intensity(0)).toBe(0));
  it("1-5 → 1", () => {
    expect(intensity(1)).toBe(1);
    expect(intensity(5)).toBe(1);
  });
  it("6-15 → 2", () => {
    expect(intensity(6)).toBe(2);
    expect(intensity(15)).toBe(2);
  });
  it("16-30 → 3", () => {
    expect(intensity(16)).toBe(3);
    expect(intensity(30)).toBe(3);
  });
  it("31+ → 4", () => {
    expect(intensity(31)).toBe(4);
    expect(intensity(999)).toBe(4);
  });
});

describe("generateCells", () => {
  it("produces N cells ending with today", () => {
    const cells = generateCells({ "2026-04-17": 5 }, NOW, 7);
    expect(cells).toHaveLength(7);
    expect(cells[cells.length - 1].key).toBe("2026-04-17");
    expect(cells[cells.length - 1].count).toBe(5);
  });

  it("earlier cells have key YYYY-MM-DD of that day", () => {
    const cells = generateCells({}, NOW, 3);
    expect(cells[0].key).toBe("2026-04-15");
    expect(cells[1].key).toBe("2026-04-16");
    expect(cells[2].key).toBe("2026-04-17");
  });

  it("days with no data have count 0", () => {
    const cells = generateCells({}, NOW, 5);
    cells.forEach((c) => expect(c.count).toBe(0));
  });
});

describe("currentStreak", () => {
  it("returns 0 if heatmap is empty", () => {
    expect(currentStreak({}, NOW)).toBe(0);
  });

  it("counts consecutive days back from today", () => {
    const heatmap = {
      "2026-04-17": 5,
      "2026-04-16": 3,
      "2026-04-15": 1,
    };
    expect(currentStreak(heatmap, NOW)).toBe(3);
  });

  it("stops at first empty day", () => {
    const heatmap = {
      "2026-04-17": 5,
      "2026-04-16": 3,
      // 15 missing
      "2026-04-14": 1,
    };
    expect(currentStreak(heatmap, NOW)).toBe(2);
  });

  it("allows empty today but counts yesterday", () => {
    const heatmap = {
      // today missing
      "2026-04-16": 3,
      "2026-04-15": 1,
    };
    expect(currentStreak(heatmap, NOW)).toBe(2);
  });
});

describe("daysStudiedInLast / daysSinceLastStudy", () => {
  const mar2 = new Date(2026, 2, 2, 0, 5).getTime(); // just after local midnight
  const k = (y: number, m: number, d: number) => toLocalDateKey(new Date(y, m, d, 12).getTime());

  it("counts across a month boundary (window = today + 6 back)", () => {
    const h = { [k(2026, 2, 2)]: 1, [k(2026, 1, 28)]: 3, [k(2026, 1, 24)]: 2, [k(2026, 1, 23)]: 9 };
    expect(daysStudiedInLast(h, mar2, 7)).toBe(3); // Feb 24 is 6 days back (in), Feb 23 is 7 (out)
  });
  it("counts across a year boundary and ignores zero counts", () => {
    const jan2 = new Date(2027, 0, 2, 9).getTime();
    const h = { "2026-12-31": 1, "2027-01-01": 0, "2027-01-02": 2, "2026-12-27": 1, "2026-12-26": 1 };
    expect(daysStudiedInLast(h, jan2, 7)).toBe(3);
  });
  it("is 0 for empty data", () => {
    expect(daysStudiedInLast({}, NOW, 7)).toBe(0);
  });
  it("daysSinceLastStudy: 0 today, gap across month, null when never", () => {
    expect(daysSinceLastStudy({ [k(2026, 2, 2)]: 1 }, mar2)).toBe(0);
    expect(daysSinceLastStudy({ [k(2026, 1, 27)]: 1 }, mar2)).toBe(3);
    expect(daysSinceLastStudy({}, NOW)).toBeNull();
  });
});
