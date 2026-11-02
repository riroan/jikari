import type { LearningState } from "./types";

/**
 * Result of aggregateDueByKey: how many review-due cards belong to each
 * subject, keyed by `dueKey` strings the home page knows about. New
 * (never-reviewed) cards are excluded — they're effectively unbounded.
 *
 * Keys mostly mirror SRS modes 1:1 (kanji, vocab, conjugation, adjective,
 * grammar, expression). The two special keys cover /sentence vs /particle,
 * which share SRS mode "sentence" and have to be split via the card-id
 * lists from cards-store.
 */
export type DueByKey = Record<string, number>;

/**
 * Aggregate due-cards per subject key.
 *
 * Splits "sentence"-mode states into `sentence_vocab` / `sentence_particle`
 * by checking the supplied id sets; states whose cardId is in neither set
 * (stale references to removed cards) are dropped — they have nowhere to
 * surface in the UI and would inflate the home header chip otherwise.
 */
export function aggregateDueByKey(
  states: Record<string, LearningState>,
  now: number,
  sentenceVocabIds: ReadonlySet<string>,
  sentenceParticleIds: ReadonlySet<string>,
): DueByKey {
  const counts: DueByKey = {};
  for (const s of Object.values(states)) {
    if (s.lastReviewed === 0 || s.nextDue > now) continue;
    if (s.mode === "sentence") {
      if (sentenceVocabIds.has(s.cardId)) {
        counts.sentence_vocab = (counts.sentence_vocab ?? 0) + 1;
      } else if (sentenceParticleIds.has(s.cardId)) {
        counts.sentence_particle = (counts.sentence_particle ?? 0) + 1;
      }
      continue;
    }
    counts[s.mode] = (counts[s.mode] ?? 0) + 1;
  }
  return counts;
}

export function totalDue(counts: DueByKey): number {
  let total = 0;
  for (const v of Object.values(counts)) total += v;
  return total;
}

/**
 * The subject with the most due cards — where "오늘의 복습" should send the
 * user. `order` is the home page's row order; a tie goes to the earlier row so
 * the target is stable between renders. Null when nothing is due.
 */
export function topDueKey(
  counts: DueByKey,
  order: readonly string[],
): { key: string; count: number } | null {
  let best: { key: string; count: number } | null = null;
  for (const key of order) {
    const count = counts[key] ?? 0;
    if (count > 0 && (best === null || count > best.count)) best = { key, count };
  }
  return best;
}

/**
 * 홈 표시용: 오늘 할 분량(목표까지)과 그 너머 밀린 분량을 나눈다.
 * 합계는 그대로 — 숨기지 않고 비중만 낮춘다.
 */
export function splitDue(total: number, goal: number): { today: number; backlog: number } {
  const today = Math.min(total, Math.max(goal, 0));
  return { today, backlog: total - today };
}
