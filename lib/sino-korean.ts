/**
 * 한국 한자음 받침 ↔ 일본 음독 어미의 규칙적 대응.
 *
 * 한국어 화자에게만 있는 지름길: 학(ㄱ) → がく, 일(ㄹ) → いち, 생(ㅇ) → せい,
 * 급(ㅂ) → きゅう, 산(ㄴ)·삼(ㅁ) → さん. 규칙이 실제로 들어맞는 한자에만 힌트를
 * 준다 — 안 맞는 걸 보여주면 오히려 헷갈린다. 정답 면에서만 쓴다 (앞면에 한국어
 * 힌트 금지, CLAUDE.md).
 */

const RULES: Record<number, { batchim: string; endings: readonly string[] }> = {
  1: { batchim: "ㄱ", endings: ["く", "き"] },
  4: { batchim: "ㄴ", endings: ["ん"] },
  8: { batchim: "ㄹ", endings: ["つ", "ち"] },
  16: { batchim: "ㅁ", endings: ["ん"] },
  17: { batchim: "ㅂ", endings: ["う"] },
  21: { batchim: "ㅇ", endings: ["う", "い"] },
};

/** 받침 index (종성, 0 = 없음) of a precomposed Hangul syllable, or null. */
function finalOf(syllable: string): number | null {
  const code = syllable.codePointAt(0);
  if (code === undefined || code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28;
}

export interface SinoKoreanHint {
  sound: string;
  reading: string;
  batchim: string;
  endings: readonly string[];
}

/**
 * First (Korean sound, on-reading) pair that follows the rule, or null.
 * One-mora readings are skipped: a lone く/き is not the 받침 echo.
 */
export function sinoKoreanHint(
  koreanSounds: readonly string[],
  onReadings: readonly string[],
): SinoKoreanHint | null {
  for (const sound of koreanSounds) {
    const fin = finalOf([...sound].at(-1) ?? "");
    const rule = fin === null ? undefined : RULES[fin];
    if (!rule) continue;
    for (const reading of onReadings) {
      if ([...reading].length < 2) continue;
      if (rule.endings.some((e) => reading.endsWith(e))) {
        return { sound, reading, batchim: rule.batchim, endings: rule.endings };
      }
    }
  }
  return null;
}
