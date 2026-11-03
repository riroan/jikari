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
 * - lastActiveAt: max. currentStreak: taken from the side with the larger lastActiveAt.
 * - quizStats: union; per-field max (lifetime counters only grow; max avoids double-counting
 *   the shared base, at the cost of under-counting when both sides answered independently).
 * - ratings: union; same mode -> side with larger lastActiveAt wins.
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
): PersistedState {
  const localNewer = local.lastActiveAt > server.lastActiveAt;
  const tie = local.lastActiveAt === server.lastActiveAt;
  const settings: Settings = { ...server.settings };
  if (base) {
    for (const k of Object.keys(local.settings) as (keyof Settings)[]) {
      if (local.settings[k] !== base[k]) (settings as Record<string, unknown>)[k] = local.settings[k];
    }
  }
  return {
    schemaVersion: Math.max(server.schemaVersion, local.schemaVersion),
    learningStates: mergeRecord(server.learningStates ?? {}, local.learningStates ?? {}, newerLearning),
    heatmap: mergeRecord(server.heatmap ?? {}, local.heatmap ?? {}, Math.max),
    lastActiveAt: Math.max(server.lastActiveAt, local.lastActiveAt),
    currentStreak: tie
      ? Math.max(server.currentStreak, local.currentStreak)
      : localNewer
        ? local.currentStreak
        : server.currentStreak,
    quizStats: mergeRecord(server.quizStats ?? {}, local.quizStats ?? {}, maxQuizStat),
    ratings: mergeRecord(server.ratings ?? {}, local.ratings ?? {}, (s, l) =>
      tie ? Math.max(s, l) : localNewer ? l : s,
    ),
    settings,
  };
}
