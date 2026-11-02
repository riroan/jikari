export const DAILY_GOALS = [10, 20, 30, 50, 100] as const;
export type DailyGoal = (typeof DAILY_GOALS)[number];
export const DEFAULT_DAILY_GOAL: DailyGoal = 20;

/** Anything not in the allowed list (missing, stale, corrupt) falls back to 20. */
export function normalizeDailyGoal(v: unknown): DailyGoal {
  return (DAILY_GOALS as readonly unknown[]).includes(v)
    ? (v as DailyGoal)
    : DEFAULT_DAILY_GOAL;
}
