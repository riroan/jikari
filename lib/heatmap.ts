import type { HeatmapData } from "./types";

/**
 * Heatmap uses YYYY-MM-DD keys in BROWSER LOCAL TIMEZONE.
 * DST is intentionally ignored (personal tool — outside voice approved this tradeoff).
 */

export function toLocalDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function incrementToday(
  heatmap: HeatmapData,
  now: number
): HeatmapData {
  const key = toLocalDateKey(now);
  return { ...heatmap, [key]: (heatmap[key] ?? 0) + 1 };
}

/**
 * Get the 4-level intensity bucket for a day count.
 * 0 → empty, 1-5 → l1, 6-15 → l2, 16-30 → l3, 31+ → l4
 */
export function intensity(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 30) return 3;
  return 4;
}

/**
 * Generate array of last N days as { key, count, intensity } from today backwards.
 * Most recent first in the array.
 */
export interface HeatmapCell {
  key: string;
  date: Date;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateCells(
  heatmap: HeatmapData,
  now: number,
  days: number = 49 // 7 weeks default
): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * DAY_MS);
    const key = toLocalDateKey(date.getTime());
    const count = heatmap[key] ?? 0;
    cells.push({ key, date, count, intensity: intensity(count) });
  }
  return cells;
}

/**
 * Compute current streak (consecutive days with activity counting back from today).
 * Yesterday-only grace: if today has 0 but yesterday has >0, still count streak from yesterday.
 */
export function currentStreak(heatmap: HeatmapData, now: number): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const date = new Date(now - i * DAY_MS);
    const key = toLocalDateKey(date.getTime());
    const count = heatmap[key] ?? 0;
    if (count > 0) {
      streak++;
    } else if (i === 0) {
      // Today empty but yesterday might still count
      continue;
    } else {
      break;
    }
  }
  return streak;
}
