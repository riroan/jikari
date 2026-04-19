/**
 * Shared intensity scale for jikari progress visualizations.
 * Used by Heatmap (daily), ChapterMastery (per-chapter).
 *
 * Levels 0–4:
 *   0 = inactive / empty (subtle background)
 *   1 = 25% accent
 *   2 = 50% accent
 *   3 = 75% accent
 *   4 = 100% accent
 *
 * Returns a CSS background string. Calls site assigns to `style.background`.
 * Uses --accent-progress token (sage in light, gold in dark per DESIGN.md § 3).
 */
export type IntensityLevel = 0 | 1 | 2 | 3 | 4;

export function intensityBg(level: IntensityLevel): string {
  switch (level) {
    case 0:
      return "rgba(26, 25, 21, 0.06)";
    case 1:
      return "color-mix(in oklab, var(--accent-progress) 28%, transparent)";
    case 2:
      return "color-mix(in oklab, var(--accent-progress) 50%, transparent)";
    case 3:
      return "color-mix(in oklab, var(--accent-progress) 75%, transparent)";
    case 4:
      return "var(--accent-progress)";
  }
}

/**
 * Convert a 0..1 mastery ratio to an IntensityLevel.
 * Boundaries: <0.05 = 0 (effectively empty),
 *             0.05–0.30 = 1, 0.30–0.55 = 2, 0.55–0.80 = 3, ≥0.80 = 4.
 */
export function ratioToIntensity(ratio: number): IntensityLevel {
  if (!Number.isFinite(ratio) || ratio <= 0.05) return 0;
  if (ratio < 0.30) return 1;
  if (ratio < 0.55) return 2;
  if (ratio < 0.80) return 3;
  return 4;
}
