"use client";

import { generateCells } from "@/lib/heatmap";
import type { HeatmapData } from "@/lib/types";

/**
 * 7-week × 7-day learning heatmap.
 * DESIGN.md § 6: self-contained, CSS grid, 4-level intensity.
 */
export function Heatmap({
  data,
  now = Date.now(),
  weeks = 7,
}: {
  data: HeatmapData;
  now?: number;
  weeks?: number;
}) {
  const cells = generateCells(data, now, weeks * 7);
  const intensityBg = (i: 0 | 1 | 2 | 3 | 4): string => {
    if (i === 0) return "rgba(26, 25, 21, 0.06)";
    if (i === 1) return "color-mix(in oklab, var(--accent-progress) 28%, transparent)";
    if (i === 2) return "color-mix(in oklab, var(--accent-progress) 50%, transparent)";
    if (i === 3) return "color-mix(in oklab, var(--accent-progress) 75%, transparent)";
    return "var(--accent-progress)";
  };

  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
      role="list"
      aria-label={`지난 ${weeks}주 학습 히트맵`}
    >
      {cells.map((cell) => (
        <time
          key={cell.key}
          dateTime={cell.key}
          role="listitem"
          aria-label={`${cell.key}, ${cell.count} cards`}
          className="block rounded-[2px]"
          style={{
            aspectRatio: "1 / 1",
            background: intensityBg(cell.intensity),
          }}
        />
      ))}
    </div>
  );
}
