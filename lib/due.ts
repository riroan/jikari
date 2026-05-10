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
