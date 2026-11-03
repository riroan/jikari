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

/** 'close'는 정답이 이 길이 이상일 때만, 편집거리 <= max(1, floor(len*0.2)). 짧은 문구는 exact 아니면 miss. */
export const CLOSE_MIN_LEN = 6;
const closeMaxEdits = (len: number) => Math.max(1, Math.floor(len * 0.2));

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

function editInfo(a: string, b: string) {
  const x = [...clean(a)];
  const y = [...clean(b)];
  const max = Math.max(x.length, y.length);
  const dist = levenshtein(x, y);
  return { dist, targetLen: y.length, score: max === 0 ? 0 : 1 - dist / max };
}

/** 0..1, 1 = 동일. 비교는 dictation의 clean() 정규화 후. */
export function similarity(a: string, b: string): number {
  return editInfo(a, b).score;
}

/**
 * 인식 결과(상위 n개)를 정답 읽기(가나)·표기(한자 포함 가능)와 비교.
 * 인식기는 한자 섞인 표기로 돌려주기도 하므로, 한자가 있는 후보는 text와도 비교한다.
 */
export function judgeSpeech(alternatives: string[], reading: string, text: string): SpeechJudgement {
  let best = { score: 0, heard: "", dist: Infinity, targetLen: 0 };
  for (const alt of alternatives) {
    if (!clean(alt)) continue;
    const targets = KANJI.test(alt) ? [reading, text] : [reading];
    for (const t of targets) {
      const e = editInfo(alt, t);
      if (e.score > best.score) best = { ...e, heard: alt };
    }
  }
  const tier: SpeechTier = best.score === 1 ? "exact" : best.targetLen >= CLOSE_MIN_LEN && best.dist <= closeMaxEdits(best.targetLen) ? "close" : "miss";
  return { tier, heard: best.heard || alternatives[0] || "", diff: diffAgainst(best.heard, reading) };
}
