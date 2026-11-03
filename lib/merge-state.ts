import { currentStreak } from "./heatmap";
import type { LearningState, PersistedState, QuizStat } from "./types";

type Settings = PersistedState["settings"];

/** Total order on two states of the same card: newer review wins; ties broken deterministically (commutative). */
function newerLearning(a: LearningState, b: LearningState): LearningState {
  const fields = ["lastReviewed", "nextDue", "box", "correctStreak"] as const;
  for (const f of fields) {
    if (a[f] !== b[f]) return a[f] > b[f] ? a : b;
  }
  return a;
}

function mergeRecord<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T) {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

const maxQuizStat = (a: QuizStat, b: QuizStat): QuizStat => ({
  correct: Math.max(a.correct, b.correct),
  wrong: Math.max(a.wrong, b.wrong),
});

/**
 * Merge the server copy with a locally queued (offline) copy.
 *
 * - learningStates: union by key; same key -> larger lastReviewed wins (never drops a newer review).
 * - heatmap: union by day, per-day max (counts only grow).
 * - lastActiveAt: max. currentStreak: recomputed from the merged heatmap as of the merged lastActiveAt
 *   (a stale copy's streak number can never overwrite the server's).
 * - quizStats: union; per-field max (lifetime counters only grow; max avoids double-counting
 *   the shared base, at the cost of under-counting when both sides answered independently).
 * - ratings: union; same mode -> the local value wins only if it DIFFERS from `baseRatings` (the server ratings
 *   the local copy was derived from, i.e. it really changed locally); otherwise the server value. No base -> server.
 * - settings: 3-way per field against `base` (server settings when the local copy was last synced):
 *   a field changed locally (local != base) wins, otherwise the server value. No base -> server.
 *
 * Known limit: ids are never deleted by merge, so an offline "reset" is resurrected from the server.
 * Losing answers is considered worse than that.
 */
export function mergeState(
  server: PersistedState,
  local: PersistedState,
  base?: Settings,
  baseRatings?: Record<string, number>,
): PersistedState {
  const lastActiveAt = Math.max(server.lastActiveAt, local.lastActiveAt);
  const heatmap = mergeRecord(server.heatmap ?? {}, local.heatmap ?? {}, Math.max);
  const settings: Settings = { ...server.settings };
  if (base) {
    for (const k of Object.keys(local.settings) as (keyof Settings)[]) {
      if (local.settings[k] !== base[k]) (settings as Record<string, unknown>)[k] = local.settings[k];
    }
  }
  const ratings: Record<string, number> = { ...server.ratings };
  for (const [mode, l] of Object.entries(local.ratings ?? {})) {
    if (!(mode in ratings) || (baseRatings && l !== baseRatings[mode])) ratings[mode] = l;
  }
  return {
    schemaVersion: Math.max(server.schemaVersion, local.schemaVersion),
    learningStates: mergeRecord(server.learningStates ?? {}, local.learningStates ?? {}, newerLearning),
    heatmap,
    lastActiveAt,
    currentStreak: lastActiveAt > 0 ? currentStreak(heatmap, lastActiveAt) : 0,
    quizStats: mergeRecord(server.quizStats ?? {}, local.quizStats ?? {}, maxQuizStat),
    ratings,
    settings,
  };
}
