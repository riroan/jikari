import { beforeEach, describe, expect, test } from "vitest";
import { preferredFor, settleConfusion, CONFUSION_KEY } from "@/lib/confusion";
import { generateKanjiChoices } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import type { KanjiCard } from "@/lib/types";

beforeEach(() => window.localStorage.removeItem(CONFUSION_KEY));

describe("confusion log", () => {
  test("틀린 선지는 쌓이고, 맞히면 하나씩 줄어 사라진다", () => {
    settleConfusion("vocab:x", false, "A");
    settleConfusion("vocab:x", false, "A");
    settleConfusion("vocab:x", false, "B");
    expect(preferredFor("vocab:x")).toEqual(["A", "B"]);
    settleConfusion("vocab:x", true);
    expect(preferredFor("vocab:x")).toEqual(["A"]);
    settleConfusion("vocab:x", true);
    expect(preferredFor("vocab:x")).toEqual([]);
  });

  test("고른 선지가 없는 오답(타이핑)은 기록하지 않는다", () => {
    settleConfusion("vocab:y", false);
    expect(preferredFor("vocab:y")).toEqual([]);
  });

  test("깨진 저장값도 견딘다", () => {
    window.localStorage.setItem(CONFUSION_KEY, "{oops");
    expect(preferredFor("vocab:z")).toEqual([]);
    settleConfusion("vocab:z", false, "A");
    expect(preferredFor("vocab:z")).toEqual(["A"]);
  });
});

describe("선지에 반영", () => {
  const k = (id: string, on: string[], kun: string[] = []): KanjiCard =>
    ({ id, onReadings: on, kunReadings: kun, koreanMeaning: id, jlptLevel: 5 }) as unknown as KanjiCard;
  const all = [
    k("甲", ["こう"]),
    ...Array.from({ length: 30 }, (_, i) => k(`k${i}`, [["あ", "い", "う", "え", "お"][i % 5] + ["ん", "く", "つ", "き", "し", "せい"][i % 6] + i])),
    k("乙", ["ばばば"]),
  ];

  test("전에 고른 오답은 (풀에 있으면) 거의 항상 선지에 오른다", () => {
    useCardsStore.setState({ kanji: all });
    let hit = 0;
    for (let seed = 0; seed < 60; seed++) {
      if (generateKanjiChoices(all[0], "on", seed, undefined, ["ばばば"]).choices.includes("ばばば")) hit++;
    }
    expect(hit).toBeGreaterThan(54);
  });
});
