import type { LearningState } from "./types";

export type Forecast = { today: number; tomorrow: number; week: number };

/**
 * 복습 예보: reviewed cards by next-due local day. `today` includes overdue,
 * `week` is cumulative through the end of day +6. Never-reviewed cards are
 * excluded (same rule as aggregateDueByKey).
 */
export function forecastDue(
  states: Record<string, LearningState>,
  now: number,
): Forecast {
  const d = new Date(now);
  const endToday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
  const endTomorrow = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2).getTime();
  const endWeek = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime();
  const f: Forecast = { today: 0, tomorrow: 0, week: 0 };
  for (const s of Object.values(states)) {
    if (s.lastReviewed === 0 || s.nextDue >= endWeek) continue;
    f.week++;
    if (s.nextDue < endToday) f.today++;
    else if (s.nextDue < endTomorrow) f.tomorrow++;
  }
  return f;
}
