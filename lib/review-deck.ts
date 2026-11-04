import type { LearningState } from "./types";
import type { MixSubject } from "./mix-deck";

export type ReviewMode = MixSubject;

export const REVIEW_CAP = 20;
export const REVIEW_DUE_KEYS = [
  "kanji", "vocab", "sentence_vocab", "sentence_particle",
  "conjugation", "adjective", "grammar", "expression",
] as const;

const MODES: readonly ReviewMode[] = [
  "kanji", "vocab", "sentence", "particle", "conjugation", "adjective", "grammar", "expression",
];

/**
 * 오늘 복습 덱: 8과목(한자·단어·문장·조사·활용·형용사·문법·표현)의 due 카드를 모드별로 오래 밀린 순으로 줄 세운 뒤
 * 모드끼리 번갈아 가며 cap장까지 뽑는다. `exists`는 삭제된 카드/조사 문장 등을 걸러낸다.
 * 문법 상태의 cardId는 `pattern:`/`particle:` 접두가 붙어 있어 벗겨서 돌려준다.
 * 문장 상태(mode "sentence")는 `exists("sentence")`면 문장, 아니면 `exists("particle")`면 조사로 갈린다.
 * 활용/형용사의 cardId(`verbId:form`)는 그대로 돌려준다 — 형 해석은 렌더 쪽 몫.
 */
export function buildReviewDeck(
  states: Record<string, LearningState>,
  now: number,
  exists: (mode: ReviewMode, cardId: string) => boolean,
  cap = REVIEW_CAP,
): Array<{ mode: ReviewMode; cardId: string }> {
  const lanes = new Map<ReviewMode, Array<{ cardId: string; due: number }>>(
    MODES.map((m) => [m, []]),
  );
  for (const s of Object.values(states)) {
    if (s.lastReviewed === 0 || s.nextDue > now) continue;
    const cardId =
      s.mode === "grammar" ? s.cardId.replace(/^(pattern|particle):/, "") : s.cardId;
    const mode: ReviewMode | undefined =
      s.mode === "sentence"
        ? exists("sentence", cardId) ? "sentence" : exists("particle", cardId) ? "particle" : undefined
        : MODES.includes(s.mode as ReviewMode) && exists(s.mode as ReviewMode, cardId)
          ? (s.mode as ReviewMode)
          : undefined;
    if (mode) lanes.get(mode)!.push({ cardId, due: s.nextDue });
  }
  for (const lane of lanes.values()) lane.sort((a, b) => a.due - b.due);

  const out: Array<{ mode: ReviewMode; cardId: string }> = [];
  for (let i = 0; out.length < cap; i++) {
    let any = false;
    for (const m of MODES) {
      const hit = lanes.get(m)![i];
      if (!hit) continue;
      any = true;
      if (out.length < cap) out.push({ mode: m, cardId: hit.cardId });
    }
    if (!any) break;
  }
  return out;
}
