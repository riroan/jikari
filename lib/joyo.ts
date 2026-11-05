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
