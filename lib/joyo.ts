import { toHiragana } from "wanakana";
import joyo from "../data/joyo.json";

/**
 * 常用漢字表 (2010, 2,136字). data/joyo.json keeps the table's own notation:
 * on-readings in katakana, kun-readings with "." before the okurigana and
 * "-" for affix-only use (ひと-, -か).
 *
 * The app's content rule is "常用漢字 only" (CLAUDE.md) — characters and,
 * for kanji cards, readings. Tests and seed tooling use this; app code
 * doesn't import it, so it never reaches the bundle.
 */
type Entry = { on: string[]; kun: string[] };
const TABLE = joyo as Record<string, Entry>;

export function isJoyo(char: string): boolean {
  return char in TABLE;
}

/** Table readings in the form kanji seeds store: hiragana, okurigana joined (くら.い → くらい). */
export function joyoReadings(char: string): { on: Set<string>; kun: Set<string> } | null {
  const e = TABLE[char];
  if (!e) return null;
  const flat = (r: string) => toHiragana(r.replace(/[.-]/g, ""));
  return { on: new Set(e.on.map(flat)), kun: new Set(e.kun.map(flat)) };
}

/** Every CJK ideograph in `text` that is not in the table. */
export function nonJoyoChars(text: string): string[] {
  return [...new Set([...text].filter((c) => /\p{Script=Han}/u.test(c) && c !== "々" && !isJoyo(c)))];
}

/**
 * Why a kanji card's readings fall outside the table, one message each —
 * empty when the card is fine. add-kanji refuses a batch with any, so raw
 * KANJIDIC data (cut stems くら, rare readings おす) can't slip in again.
 */
export function joyoReadingProblems(card: {
  id: string;
  onReadings: readonly string[];
  kunReadings: readonly string[];
}): string[] {
  const j = joyoReadings(card.id);
  if (!j) return [`${card.id}: 상용한자가 아님`];
  return [
    ...card.onReadings.filter((r) => !j.on.has(r)).map((r) => `${card.id} 音 ${r}`),
    ...card.kunReadings.filter((r) => !j.kun.has(r)).map((r) => `${card.id} 訓 ${r}`),
  ];
}

/**
 * 훈독을 [어간, 오쿠리가나]로 가른다 (常用漢字表의 "かた.る" 표기를 이용).
 * 시드의 훈독은 전체형("かたる")이라 표에서 같은 읽기를 찾아 점 위치로 자른다.
 * 오쿠리가나가 없는 읽기(かね)나 표에 없는 읽기는 [reading, ""].
 */
export function splitOkurigana(char: string, reading: string): [string, string] {
  const e = TABLE[char];
  if (!e) return [reading, ""];
  for (const k of e.kun) {
    const dot = k.indexOf(".");
    if (dot < 0) continue;
    const flat = k.replace(/-/g, "");
    if (toHiragana(flat.replace(".", "")) === reading) {
      const stem = toHiragana(flat.slice(0, flat.indexOf(".")));
      return [stem, reading.slice(stem.length)];
    }
  }
  return [reading, ""];
}
