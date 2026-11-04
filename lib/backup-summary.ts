import type { PersistedState } from "./types";

/**
 * Counts shown in the restore preview so the user sees what will be overwritten.
 *
 * Kept out of lib/import.ts on purpose: that module pulls in Zod, and the
 * settings page renders this preview on every visit while it only needs Zod
 * once a backup file is actually picked (it imports parseBackup lazily).
 */
export function summarizeBackup(s: PersistedState) {
  return {
    cards: Object.keys(s.learningStates).length,
    streak: s.currentStreak,
    studyDays: Object.keys(s.heatmap).length,
    lastActiveAt: s.lastActiveAt,
    dailyGoal: s.settings.dailyGoal,
  };
}
