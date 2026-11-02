import type { LearningState } from "./types";

export type ReviewMode = "kanji" | "vocab" | "sentence" | "grammar";

export const REVIEW_CAP = 20;
export const REVIEW_DUE_KEYS = ["kanji", "vocab", "sentence_vocab", "grammar"] as const;

const MODES: readonly ReviewMode[] = ["kanji", "vocab", "sentence", "grammar"];

/**
 * 오늘 복습 덱: 한자·단어·문장·문법의 due 카드를 모드별로 오래 밀린 순으로 줄 세운 뒤
 * 모드끼리 번갈아 가며 cap장까지 뽑는다. `exists`는 삭제된 카드/조사 문장 등을 걸러낸다.
 * 문법 상태의 cardId는 `pattern:`/`particle:` 접두가 붙어 있어 벗겨서 돌려준다.
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
    const lane = lanes.get(s.mode as ReviewMode);
    if (!lane || s.lastReviewed === 0 || s.nextDue > now) continue;
    const cardId =
      s.mode === "grammar" ? s.cardId.replace(/^(pattern|particle):/, "") : s.cardId;
    if (exists(s.mode as ReviewMode, cardId)) lane.push({ cardId, due: s.nextDue });
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
