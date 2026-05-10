"use client";

import { generateCells, toLocalDateKey } from "@/lib/heatmap";
import { intensityBg } from "@/lib/intensity";
import { useClientNow } from "@/lib/use-is-client";
import type { HeatmapData } from "@/lib/types";

/**
 * 7-week × 7-day learning heatmap.
 * DESIGN.md § 6: self-contained, CSS grid, 4-level intensity.
 *
 * `now` is optional; when omitted, falls back to a stable client-side
 * timestamp. Tests pass an explicit `now` for determinism.
 *
 * Today's cell carries a 1px outline so users can locate the current
 * day at a glance. The outline uses --fg so it sits on either palette.
 */
export function Heatmap({
  data,
  now,
  weeks = 7,
}: {
  data: HeatmapData;
  now?: number;
  weeks?: number;
}) {
  const clientNow = useClientNow();
  const ts = now ?? clientNow ?? 0;
  const cells = generateCells(data, ts, weeks * 7);
  const todayKey = ts > 0 ? toLocalDateKey(ts) : null;

  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}
      role="list"
      aria-label={`지난 ${weeks}주 학습 히트맵`}
    >
      {cells.map((cell) => {
        const isToday = cell.key === todayKey;
        return (
          <time
            key={cell.key}
            dateTime={cell.key}
            role="listitem"
            aria-label={
              isToday
                ? cell.count === 0
                  ? `오늘 ${cell.key}, 학습 없음`
                  : `오늘 ${cell.key}, ${cell.count}장`
                : cell.count === 0
                  ? `${cell.key}, 학습 없음`
                  : `${cell.key}, ${cell.count}장`
            }
            className="block rounded-[2px]"
            style={{
              aspectRatio: "1 / 1",
              background: intensityBg(cell.intensity),
              outline: isToday ? "1px solid var(--fg)" : undefined,
              outlineOffset: isToday ? "1px" : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
