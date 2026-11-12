import { describe, it, expect } from "vitest";
import {
  DEFAULT_PROGRESSION as P0,
  addReward,
  buyFreeze,
  buyItem,
  consumeFreezes,
  equipItem,
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
  key: "kanji:日", correct: true, typed: false, mastered: false,
  todayCount: 1, dailyGoal: 20, streak: 1, now: NOW, ...o,
});

describe("earn", () => {
  it("choice 1 / typed 2 / mastered +5, wrong 0", () => {
    expect(earn(P0, ctx()).xp).toBe(1);
    expect(earn(P0, ctx({ typed: true, mastered: true })).xp).toBe(7);
    expect(earn(P0, ctx({ correct: false })).xp).toBe(0);
  });

  it("goal bonus pays even when the goal-th answer is wrong, capped at the goal size", () => {
    expect(earn(P0, ctx({ correct: false, todayCount: 20 })).xp).toBe(20);
    expect(earn(P0, ctx({ todayCount: 10, dailyGoal: 10 })).xp).toBe(1 + 10);
  });

  it("harder cards pay more: N5/N4 +0, N3급 +1, N2·N1급 +2 (none when unknown)", () => {
    expect([1000, 1250, 1400, 1500, 1750, 2000, undefined].map((d) => earn(P0, ctx({ difficulty: d })).xp)).toEqual([
      1, 1, 1, 2, 3, 3, 1,
    ]);
    expect(earn(P0, ctx({ typed: true, difficulty: 2000 })).xp).toBe(4);
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
    expect(unlockPalette(rich, "sakura", NOW)).toBeNull(); // 2000 < 2500
    const p = unlockPalette({ ...rich, xp: 3000 }, "sakura", NOW)!;
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

describe("cosmetics", () => {
  it("buyItem spends, owns and equips; can't buy twice or when short", () => {
    const p = buyItem({ ...P0, xp: 2000 }, "frame:double", NOW)!;
    expect([pointsOf(p), p.items, p.equip.frame]).toEqual([500, ["frame:double"], "frame:double"]);
    expect(buyItem(p, "frame:double", NOW)).toBeNull();
    expect(buyItem(P0, "skin:washi", NOW)).toBeNull();
    expect(buyItem({ ...P0, xp: 9999 }, "nope", NOW)).toBeNull();
  });

  it("equipItem only takes owned items of the same slot; '' resets", () => {
    const p = buyItem({ ...P0, xp: 9999 }, "skin:sumi", NOW)!;
    expect(equipItem(p, "skin", "").equip.skin).toBe("");
    expect(equipItem(p, "frame", "skin:sumi")).toBe(p);
    expect(equipItem(p, "skin", "skin:washi")).toBe(p);
  });

  it("merge unions items, local equip wins, old saves without items/equip don't crash", () => {
    const server = { ...P0, xp: 5000 } as Partial<typeof P0>;
    delete server.items;
    delete server.equip;
    const local = buyItem({ ...P0, xp: 5000 }, "stamp:ryou", NOW)!;
    const m = mergeProgression(server as typeof P0, local)!;
    expect([m.items, m.equip.stamp]).toEqual([["stamp:ryou"], "stamp:ryou"]);
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

  it("adds independent earnings and purchases once from a shared base", () => {
    const base = { ...P0, xp: 5000 };
    const server = buyItem({ ...base, xp: 5010 }, "frame:double", NOW)!;
    const local = buyItem({ ...base, xp: 5020 }, "skin:sumi", NOW + 1)!;
    const merged = mergeProgression(server, local, base)!;
    expect([merged.xp, merged.spent, pointsOf(merged)]).toEqual([5030, 3500, 1530]);
    expect(merged.items).toEqual(["frame:double", "skin:sumi"]);
    expect(mergeProgression(server, merged, server)!.spent).toBe(3500);
  });

  it("keeps today's bonus and card cap when the other device has more XP", () => {
    const local = earn({ ...P0, xp: 50 }, ctx({ todayCount: 20, correct: false }));
    const server = { ...P0, xp: 100 };
    const merged = mergeProgression(server, local)!;
    expect(merged.bonusDay).toBe(local.bonusDay);
    expect(earn(merged, ctx({ todayCount: 21, correct: false })).xp).toBe(100);
    const capped = earn(earn(P0, ctx()), ctx());
    expect(earn(mergeProgression({ ...P0, xp: 100 }, capped)!, ctx()).xp).toBe(100);
  });

  it("combines independent daily card counts and freeze purchases", () => {
    const a = earn(P0, ctx());
    const b = earn(P0, ctx());
    const merged = mergeProgression(a, b, P0)!;
    expect([merged.xp, merged.dayCounts["kanji:日"]]).toEqual([2, 2]);
    expect(earn(merged, ctx()).xp).toBe(2);
    const rich = { ...P0, xp: 1000 };
    const freezes = mergeProgression(buyFreeze(rich, NOW)!, buyFreeze(rich, NOW + 1)!, rich)!;
    expect([freezes.freezes, freezes.spent]).toEqual([2, 400]);
  });

  it("charges a permanent item only once when both devices buy it", () => {
    const base = { ...P0, xp: 5000 };
    const a = buyItem(base, "frame:double", NOW)!;
    const b = buyItem(base, "frame:double", NOW + 1)!;
    const merged = mergeProgression(a, b, base)!;
    expect([merged.spent, merged.items, merged.ledger.length]).toEqual([1500, ["frame:double"], 1]);
  });
});
