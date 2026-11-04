// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { exportState } from "@/lib/store";
import { parseBackup } from "@/lib/import";
import { applyExtras } from "@/lib/extras";
import { loadMisses, saveMisses } from "@/lib/misses";
import { loadMemos, saveMemos } from "@/lib/memos";
import { loadWeak, saveWeak } from "@/lib/reading";

describe("extras round trip", () => {
  beforeEach(() => localStorage.clear());

  it("export -> wipe -> import restores local data and fires events", () => {
    saveMisses([{ key: "kanji:日", count: 3, ok: 1, last: 10 }]);
    saveMemos([{ key: "vocab:1", text: "메모", at: 5 }]);
    saveWeak(new Set(["s1"]));
    const json = exportState();
    localStorage.clear();
    let fired = 0;
    window.addEventListener("jikari-misses", () => fired++);
    window.addEventListener("jikari-memos", () => fired++);
    const r = parseBackup(json);
    if (!r.ok) throw new Error("import failed");
    applyExtras(r.extras);
    expect(loadMisses()).toEqual([{ key: "kanji:日", count: 3, ok: 1, last: 10 }]);
    expect(loadMemos()).toEqual([{ key: "vocab:1", text: "메모", at: 5 }]);
    expect([...loadWeak()]).toEqual(["s1"]);
    expect(fired).toBe(2);
  });

  it("no extras leaves device data untouched", () => {
    saveMemos([{ key: "k", text: "t", at: 1 }]);
    applyExtras(undefined);
    expect(loadMemos()).toHaveLength(1);
  });
});
