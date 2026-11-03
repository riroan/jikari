export const MAX_HINT_LEVEL = 2;

const KANA = /^[ぁ-ゟ゠-ヿー]+$/;
const SMALL_KANA = /[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]/;

/**
 * The string the hint is built from: first kana-form acceptable answer (same
 * rule as TypedChallengeCard's speakText), else a kana `reading` fallback
 * (kanji-only answers), else the first answer (e.g. Korean meanings).
 */
export function hintAnswer(answers: string[], reading?: string): string | null {
  const kana = answers.find((a) => KANA.test(a));
  if (kana) return kana;
  if (reading && KANA.test(reading)) return reading;
  return answers[0] ?? null;
}

/**
 * level 1: first char + ＿ for the rest. level 2: first ceil(n/2) chars.
 * Length = code points, i.e. what the user types (きゃ = 2). A small kana that
 * would be the first hidden char stays attached to the shown one.
 */
export function buildHint(answer: string, level: number): string {
  const chars = Array.from(answer);
  const n = chars.length;
  let shown = level <= 0 ? 0 : level === 1 ? 1 : Math.ceil(n / 2);
  shown = Math.min(shown, n > 1 ? n - 1 : n);
  while (shown > 0 && shown < n && SMALL_KANA.test(chars[shown])) shown++;
  return chars.map((c, i) => (i < shown || c === " " ? c : "＿")).join("");
}
