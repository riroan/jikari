import { toHiragana } from "wanakana";

/**
 * Normalize a Japanese reading input for answer comparison.
 *
 * Accepts romaji / katakana / hiragana — all collapse to hiragana.
 * Applies Unicode NFC, trims, and removes ALL inner whitespace
 * (mobile IMEs sometimes emit "き っ て" between syllables).
 *
 *   "NICHI"     → "にち"
 *   "ニチ"      → "にち"
 *   " にち "    → "にち"
 *   "き っ て"  → "きって"
 */
export function normalizeJapanese(input: string): string {
  return toHiragana(input.normalize("NFC").replace(/\s+/g, ""));
}

/**
 * Normalize a Korean meaning input for answer comparison.
 *
 * Minimal normalize only (deliberate: fuzzy matching hurts learning effect):
 *   - NFC
 *   - trim
 *   - strip surrounding punctuation (., !, ?, 。, ！, ？, , ，)
 *   - collapse inner whitespace runs to single space
 *
 * 어미 변형(먹는다↔먹다)·동의어는 처리하지 않음.
 */
export function normalizeKorean(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .replace(/^[.,!?。！？，、]+|[.,!?。！？，、]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether a normalized user input matches ANY of the acceptable answers.
 *
 * `normalize` should be one of `normalizeJapanese` / `normalizeKorean`.
 * Both sides are normalized with the same function before comparison.
 */
export function matchesAnyAnswer(
  input: string,
  acceptable: readonly string[],
  normalize: (s: string) => string,
): boolean {
  const n = normalize(input);
  if (n.length === 0) return false;
  for (const candidate of acceptable) {
    if (normalize(candidate) === n) return true;
  }
  return false;
}
