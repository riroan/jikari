import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyAnswer, CLEAR_AFTER, groupByRecency, loadMisses, MISSES_CAP, MISSES_KEY, recordMissAnswer,
} from "@/lib/misses";

afterEach(() => vi.unstubAllGlobals());

const mem = () => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
  vi.stubGlobal("window", { dispatchEvent: () => true });
  return data;
};

describe("applyAnswer", () => {
  it("dedupes by key, counts misses, newest first", () => {
    let l = applyAnswer([], "kanji:a", false, 1);
    l = applyAnswer(l, "vocab:b", false, 2);
    l = applyAnswer(l, "kanji:a", false, 3);
    expect(l).toEqual([
      { key: "kanji:a", count: 2, ok: 0, last: 3 },
      { key: "vocab:b", count: 1, ok: 0, last: 2 },
    ]);
  });

  it("ignores correct answers for unknown cards", () => {
    const l = applyAnswer([], "kanji:a", true, 1);
    expect(l).toEqual([]);
  });

  it("clears after consecutive correct answers; a miss resets the streak", () => {
    let l = applyAnswer([], "kanji:a", false, 1);
    l = applyAnswer(l, "kanji:a", true, 2);
    l = applyAnswer(l, "kanji:a", false, 3);
    for (let i = 1; i < CLEAR_AFTER; i++) l = applyAnswer(l, "kanji:a", true, 4);
    expect(l).toHaveLength(1);
    l = applyAnswer(l, "kanji:a", true, 5);
    expect(l).toEqual([]);
  });

  it("caps at MISSES_CAP, dropping the oldest", () => {
    let l: ReturnType<typeof applyAnswer> = [];
    for (let i = 0; i < MISSES_CAP + 5; i++) l = applyAnswer(l, `vocab:${i}`, false, i);
    expect(l).toHaveLength(MISSES_CAP);
    expect(l[0].key).toBe(`vocab:${MISSES_CAP + 4}`);
    expect(l.some((m) => m.key === "vocab:0")).toBe(false);
  });
});

describe("storage", () => {
  it("persists and skips unlogged modes", () => {
    const data = mem();
    recordMissAnswer("kanji", "x", false, 5);
    recordMissAnswer("conjugation", "y", false, 5);
    expect(loadMisses()).toEqual([{ key: "kanji:x", count: 1, ok: 0, last: 5 }]);
    expect(data.has(MISSES_KEY)).toBe(true);
  });

  it("survives unavailable or corrupt storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    });
    expect(loadMisses()).toEqual([]);
    expect(() => recordMissAnswer("kanji", "x", false)).not.toThrow();
    vi.stubGlobal("localStorage", { getItem: () => "{oops", setItem: () => {} });
    expect(loadMisses()).toEqual([]);
  });
});

describe("groupByRecency", () => {
  it("splits today / this week / older", () => {
    const now = new Date(2026, 10, 4, 15).getTime();
    const h = 3_600_000;
    const m = (key: string, last: number) => ({ key, count: 1, ok: 0, last });
    const g = groupByRecency([m("a", now - h), m("b", now - 2 * 86_400_000), m("c", now - 30 * 86_400_000)], now);
    expect(g.map((x) => [x.label, x.items.map((i) => i.key)])).toEqual([
      ["오늘", ["a"]], ["이번 주", ["b"]], ["이전", ["c"]],
    ]);
  });
});

describe("missCard", () => {
  it("resolves present cards (grammar subtype stripped) and drops removed ones", async () => {
    const { useCardsStore } = await import("@/lib/cards-store");
    const { missCard } = await import("@/lib/misses");
    useCardsStore.setState({
      kanjiById: new Map([["k1", { id: "k1" } as never]]),
      grammarById: new Map([["g1", { id: "g1" } as never]]),
    });
    expect(missCard("kanji:k1")?.ref).toEqual({ mode: "kanji", cardId: "k1" });
    expect(missCard("grammar:pattern:g1")?.ref).toEqual({ mode: "grammar", cardId: "g1" });
    expect(missCard("kanji:gone")).toBeNull();
    expect(missCard("bogus:x")).toBeNull();
  });
});
