import { afterEach, describe, expect, it, vi } from "vitest";
import { applyMemo, loadMemos, MEMOS_CAP, MEMO_MAX, setMemo } from "@/lib/memos";

afterEach(() => vi.unstubAllGlobals());

describe("applyMemo", () => {
  it("creates, replaces, and deletes on empty", () => {
    let l = applyMemo([], "kanji:a", " 하나 ", 1);
    expect(l).toEqual([{ key: "kanji:a", text: "하나", at: 1 }]);
    l = applyMemo(l, "kanji:a", "둘", 2);
    expect(l).toEqual([{ key: "kanji:a", text: "둘", at: 2 }]);
    expect(applyMemo(l, "kanji:a", "  ", 3)).toEqual([]);
  });
  it("limits to 80 chars", () => {
    expect([...applyMemo([], "k:a", "가".repeat(200), 1)[0].text]).toHaveLength(MEMO_MAX);
  });
  it("caps, dropping the oldest", () => {
    let l = applyMemo([], "k:0", "x", 0);
    for (let i = 1; i <= MEMOS_CAP; i++) l = applyMemo(l, `k:${i}`, "x", i);
    expect(l).toHaveLength(MEMOS_CAP);
    expect(l.some((m) => m.key === "k:0")).toBe(false);
  });
});

describe("storage", () => {
  it("round-trips through localStorage", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) });
    vi.stubGlobal("window", { dispatchEvent: () => true });
    setMemo("vocab:x", "연상", 5);
    expect(loadMemos()).toEqual([{ key: "vocab:x", text: "연상", at: 5 }]);
  });
});
