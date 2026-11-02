import type { CardMode, LearningState } from "./types";

/**
 * Weak cards = reviewed at least once and the *latest* answer was wrong
 * (`advance` zeroes correctStreak only on a miss). One correct answer clears it,
 * so the list is "still to fix", not a lifetime blacklist.
 *
 * ponytail: per-card miss counts are not persisted (learning_states has no such
 * column; adding one needs a migration). Lowest box first = missed repeatedly
 * without recovering; ties by most recent miss.
 */
export function weakCardIds(
  states: Record<string, LearningState>,
  mode: CardMode,
  pool?: ReadonlySet<string>,
): string[] {
  const weak: LearningState[] = [];
  for (const s of Object.values(states)) {
    if (s.mode !== mode || s.lastReviewed === 0 || s.correctStreak > 0) continue;
    if (pool && !pool.has(s.cardId)) continue;
    weak.push(s);
  }
  weak.sort((a, b) => a.box - b.box || b.lastReviewed - a.lastReviewed);
  return weak.map((s) => s.cardId);
}
