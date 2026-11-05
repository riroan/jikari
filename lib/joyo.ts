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
