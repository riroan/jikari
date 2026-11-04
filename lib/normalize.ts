import { toHiragana, toKatakana } from "wanakana";

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
 *   "たべる。"  → "たべる"   (IME가 붙이는 문장부호는 채점하지 않는다)
 *
 * 문장부호(。、！？「」・ 및 ASCII .,!?)는 지운다 — 일본어 IME는 확정할 때 。를
 * 붙이기 쉬운데, 그 한 글자로 정답이 오답이 됐다. 장음 ー는 건드리지 않는다.
 */
const JA_PUNCT = /[。、，．！？「」『』・.,!?]/g;

export function normalizeJapanese(input: string): string {
  // 가타카나를 한 번 거친다: wanakana는 가타카나의 장음 ー만 모음으로 펴서
  // (ラーメン → らあめん) 히라가나로 친 らーめん과 어긋났다. 받아쓰기(lib/dictation)는
  // 이미 이렇게 하고 있었다.
  return toHiragana(toKatakana(input.normalize("NFC").replace(/\s+/g, "").replace(JA_PUNCT, "")));
}

/**
 * Normalize a Korean meaning input for answer comparison.
 *
 * Minimal normalize only (deliberate: fuzzy matching hurts learning effect):
 *   - NFC
 *   - trim
 *   - strip surrounding punctuation (., !, ?, 。, ！, ？, , ，)
 *   - drop all whitespace — 띄어쓰기는 채점하지 않는다. "한 번"/"한번",
 *     "보여 주다"/"보여주다"는 맞춤법상 둘 다 쓰이고, 이 퀴즈가 묻는 건 뜻이지
 *     띄어쓰기가 아니다. 데이터도 같은 말을 카드마다 다르게 띄어 쓴다.
 *
 * 어미 변형(먹는다↔먹다)·동의어는 처리하지 않음.
 */
export function normalizeKorean(input: string): string {
  return input
    .normalize("NFC")
    .trim()
    .replace(/^[.,!?。！？，、]+|[.,!?。！？，、]+$/g, "")
    .replace(/\s+/g, "");
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
