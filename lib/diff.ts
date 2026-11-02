import { normalizeJapanese } from "./normalize";

export interface DiffChar {
  ch: string;
  /** false = this char of the correct answer was missing/wrong in the input */
  ok: boolean;
}

/**
 * Char-level LCS diff over the correct answer: marks which characters of
 * `correct` the user's input did not reproduce. Both sides are normalized to
 * hiragana first so romaji/katakana input diffs fairly.
 */
export function diffAgainst(input: string, correct: string): DiffChar[] {
  const a = [...normalizeJapanese(input)];
  const b = [...normalizeJapanese(correct)];
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffChar[] = b.map((ch) => ({ ch, ok: false }));
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out[j].ok = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return out;
}

/** Pick the acceptable answer closest to the input (most matching chars). */
export function closestAnswer(input: string, acceptable: readonly string[]): string {
  let best = acceptable[0] ?? "";
  let bestScore = -1;
  for (const c of acceptable) {
    const score = diffAgainst(input, c).filter((d) => d.ok).length;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}
