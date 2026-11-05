/**
 * 작문(한국어 뜻 → 일본어 문장) 채점.
 *
 * 한자·가나 표기가 사람마다 다르고 IME가 문장부호를 붙이기도 해서 문자열 완전
 * 일치로는 정답이 자주 오답이 된다. 그래서 후리가나 마크업 `{漢字|かんじ}`의 각
 * 루비 단위를 한자형/가나형 어느 쪽으로든 쓴 모든 조합을 정답으로 인정한다
 * (전부 한자, 전부 가나, 일부만 한자). 비교는 normalizeJapanese로 — 히라가나
 * 통일, 공백·문장부호 제거 — 한다.
 *
 * exact : 허용 표기 중 하나와 같다 → 정답.
 * close : 한두 글자만 다르다(조사·활용 실수 등). 오답으로 치되 정답과 나란히 보여
 *         준다. 호출 쪽이 "내 답도 맞아요"로 뒤집을 수 있다.
 * miss  : 그 밖.
 * 정답이 하나가 아닌 작문이라 마지막 판단은 학습자가 할 수 있게 둔다.
 */
import { normalizeJapanese } from "./normalize";

export type WriteTier = "exact" | "close" | "miss";

export interface WriteJudgement {
  tier: WriteTier;
  /** 입력과 가장 가까운 허용 표기 (정규화 전 원형). */
  closest: string;
}

const UNIT = /\{([^|{}]+)\|([^|{}]+)\}|[\s\S]/gu;
const MAX_COMBOS = 256;
/** close를 인정하는 최소 길이 — 너무 짧은 문장에서는 한 글자 차이가 곧 다른 문장이다. */
export const CLOSE_MIN_LEN = 6;

/** 마크업에서 허용 표기 전부 (루비 단위가 많으면 전부 한자/전부 가나 두 가지만). */
export function acceptableForms(markup: string): string[] {
  const parts: Array<string | [string, string]> = [];
  for (const m of markup.matchAll(UNIT)) parts.push(m[1] !== undefined ? [m[1], m[2]] : m[0]);
  const rubies = parts.filter((p) => typeof p !== "string").length;
  if (rubies === 0) return [markup];
  if (2 ** rubies > MAX_COMBOS) {
    return [
      parts.map((p) => (typeof p === "string" ? p : p[0])).join(""),
      parts.map((p) => (typeof p === "string" ? p : p[1])).join(""),
    ];
  }
  let forms = [""];
  for (const p of parts) {
    forms =
      typeof p === "string"
        ? forms.map((f) => f + p)
        : forms.flatMap((f) => [f + p[0], f + p[1]]);
  }
  return forms;
}

function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length];
}

export function judgeWriting(input: string, markup: string): WriteJudgement {
  const typed = [...normalizeJapanese(input)];
  const forms = acceptableForms(markup);
  let best = forms[0];
  let bestDist = Infinity;
  for (const f of forms) {
    const d = distance(typed.join(""), normalizeJapanese(f));
    if (d < bestDist) {
      bestDist = d;
      best = f;
    }
    if (d === 0) return { tier: "exact", closest: f };
  }
  const len = [...normalizeJapanese(best)].length;
  const close = len >= CLOSE_MIN_LEN && bestDist <= Math.max(1, Math.floor(len * 0.12));
  return { tier: close ? "close" : "miss", closest: best };
}
