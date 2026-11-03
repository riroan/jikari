import { clean } from "./dictation";
import { diffAgainst, type DiffChar } from "./diff";

export type SpeechTier = "exact" | "close" | "miss";

export interface SpeechJudgement {
  tier: SpeechTier;
  /** 가장 가까웠던 인식 결과(원문). 비어 있으면 "". */
  heard: string;
  /** reading 기준 글자별 diff (heard가 한자 섞인 표기면 참고용). */
  diff: DiffChar[];
}

export const CLOSE_THRESHOLD = 0.8;

const KANJI = /[一-鿿々]/;

function levenshtein(a: string[], b: string[]): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** 0..1, 1 = 동일. 비교는 dictation의 clean() 정규화 후. */
export function similarity(a: string, b: string): number {
  const x = [...clean(a)];
  const y = [...clean(b)];
  const max = Math.max(x.length, y.length);
  return max === 0 ? 0 : 1 - levenshtein(x, y) / max;
}

/**
 * 인식 결과(상위 n개)를 정답 읽기(가나)·표기(한자 포함 가능)와 비교.
 * 인식기는 한자 섞인 표기로 돌려주기도 하므로, 한자가 있는 후보는 text와도 비교한다.
 */
export function judgeSpeech(alternatives: string[], reading: string, text: string): SpeechJudgement {
  let best = { score: 0, heard: "" };
  for (const alt of alternatives) {
    if (!clean(alt)) continue;
    const targets = KANJI.test(alt) ? [reading, text] : [reading];
    for (const t of targets) {
      const score = similarity(alt, t);
      if (score > best.score) best = { score, heard: alt };
    }
  }
  const tier: SpeechTier = best.score === 1 ? "exact" : best.score >= CLOSE_THRESHOLD ? "close" : "miss";
  return { tier, heard: best.heard || alternatives[0] || "", diff: diffAgainst(best.heard, reading) };
}
