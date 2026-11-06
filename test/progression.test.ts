import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROGRESSION as P0,
  addReward,
  buyFreeze,
  consumeFreezes,
  earn,
  mergeProgression,
  pointsOf,
  rankOf,
  redeemReward,
  removeReward,
  unlockPalette,
  type AnswerContext,
} from "@/lib/progression";
import { currentStreak, keyDaysAgo } from "@/lib/heatmap";

const NOW = new Date(2026, 10, 6, 12).getTime();
const ctx = (o: Partial<AnswerContext> = {}): AnswerContext => ({
  key: "kanji:日", correct: true, typed: false, wasDue: false, mastered: false,
  todayCount: 1, dailyGoal: 20, streak: 1, now: NOW, ...o,
});

describe("earn", () => {
  it("choice 1 / typed 2 / due +1 / mastered +5, wrong 0", () => {
    expect(earn(P0, ctx()).xp).toBe(1);
    expect(earn(P0, ctx({ typed: true, wasDue: true, mastered: true })).xp).toBe(8);
    expect(earn(P0, ctx({ correct: false }))).toBe(P0);
  });

  it("same card earns at most twice a day, counter resets the next day", () => {
    let p = P0;
    for (let i = 0; i < 5; i++) p = earn(p, ctx());
    expect(p.xp).toBe(2);
    p = earn(p, ctx({ now: NOW + 86_400_000 }));
    expect(p.xp).toBe(3);
  });

  it("daily-goal and 7-day bonuses pay once per day", () => {
    let p = earn(P0, ctx({ todayCount: 20, streak: 7 }));
    expect(p.xp).toBe(1 + 20 + 50);
    p = earn(p, ctx({ key: "kanji:月", todayCount: 21, streak: 7 }));
    expect(p.xp).toBe(72);
  });

  it("records the first time each rank is reached", () => {
    const p = earn({ ...P0, xp: 149 }, ctx());
    expect(rankOf(p.xp).name).toBe("9級");
    expect(p.rankAt).toEqual({ 0: NOW, 1: NOW });
  });
});

describe("rankOf", () => {
  it("floors into the table and caps at the top", () => {
    expect(rankOf(0)).toMatchObject({ name: "10級", next: { name: "9級", xp: 150 } });
    expect(rankOf(12000).name).toBe("初段");
    expect(rankOf(10 ** 7)).toMatchObject({ name: "十段", next: null });
  });
});

describe("freezes", () => {
  const studied = (daysAgo: number[]) => Object.fromEntries(daysAgo.map((d) => [keyDaysAgo(NOW, d), 3]));

  it("fills a 1-day gap and keeps the streak", () => {
    const heatmap = studied([2, 3]);
    const p = consumeFreezes({ ...P0, freezes: 1 }, heatmap, NOW);
    expect(p.freezes).toBe(0);
    expect(p.frozenDays).toEqual([keyDaysAgo(NOW, 1)]);
    expect(currentStreak({ ...heatmap, [keyDaysAgo(NOW, 0)]: 1 }, NOW, p.frozenDays)).toBe(4);
  });

  it("does nothing when the gap is longer than the freezes held, or there is no gap", () => {
    const p = { ...P0, freezes: 1 };
    expect(consumeFreezes(p, studied([3]), NOW)).toBe(p);
    expect(consumeFreezes(p, studied([1]), NOW)).toBe(p);
  });
});

describe("shop", () => {
  const rich = { ...P0, xp: 2000 };
  it("spends points, logs it, and refuses when short or maxed", () => {
    const f = buyFreeze(rich, NOW)!;
    expect([f.freezes, pointsOf(f), f.ledger[0].label]).toEqual([1, 1800, "휴식권"]);
    expect(buyFreeze({ ...rich, freezes: 2 }, NOW)).toBeNull();
    expect(buyFreeze(P0, NOW)).toBeNull();
  });

  it("palette unlock applies it and can't be bought twice", () => {
    const p = unlockPalette(rich, "sakura", NOW)!;
    expect([p.palette, pointsOf(p)]).toEqual(["sakura", 500]);
    expect(unlockPalette(p, "sakura", NOW)).toBeNull();
  });

  it("custom rewards: add validates, redeem spends", () => {
    expect(addReward(rich, "  ", 10, NOW)).toBeNull();
    expect(addReward(rich, "x", 0, NOW)).toBeNull();
    const p = addReward(rich, "보상", 300, NOW)!;
    expect(pointsOf(redeemReward(p, p.rewards[0].id, NOW)!)).toBe(1700);
  });
});

describe("mergeProgression", () => {
  it("unions unlocks and keeps the earliest rank dates", () => {
    const a = { ...P0, xp: 100, palettes: ["sakura"], rankAt: { 0: 5 } };
    const b = { ...P0, xp: 300, palettes: ["yuki"], rankAt: { 0: 9, 1: 10 } };
    const m = mergeProgression(a, b)!;
    expect(m.xp).toBe(300);
    expect(m.palettes.sort()).toEqual(["sakura", "yuki"]);
    expect(m.rankAt).toEqual({ 0: 5, 1: 10 });
    expect(mergeProgression(undefined, a)).toBe(a);
  });

  it("never refunds a purchase or drops earned xp (codex P2)", () => {
    const server = buyFreeze({ ...P0, xp: 2000 }, NOW)!; // spent 200, freezes 1
    const local = { ...P0, xp: 2201 };
    const m = mergeProgression(server, local)!;
    expect([m.xp, m.spent, m.freezes, m.ledger.length]).toEqual([2201, 200, 1, 1]);
  });

  it("an offline delete is not resurrected, and the reward cap holds", () => {
    const base = addReward({ ...P0, xp: 10 }, "보상", 5, NOW)!;
    const local = removeReward(base, base.rewards[0].id);
    expect(mergeProgression(base, local)!.rewards).toEqual([]);
    let full = P0;
    for (let i = 0; i < 100; i++) full = addReward(full, `r${i}`, 1, NOW + i)!;
    expect(addReward(full, "101", 1, NOW + 200)).toBeNull();
  });

  it("the local palette choice wins when totals tie", () => {
    const server = { ...P0, xp: 2000, palettes: ["sakura"], palette: "" };
    const local = { ...server, palette: "sakura" };
    expect(mergeProgression(server, local)!.palette).toBe("sakura");
  });
});
