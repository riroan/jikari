"use client";

import { useStore } from "@/lib/store";
import type { QuizStatKey } from "@/lib/types";

/**
 * Minimal lifetime ◯/✕ tally for a quiz page. Returns null until the user has
 * answered at least once so the header doesn't show an empty 0·0 on first visit.
 */
export function QuizStats({ statKey }: { statKey: QuizStatKey }) {
  const stat = useStore((s) => s.quizStats[statKey]);
  const correct = stat?.correct ?? 0;
  const wrong = stat?.wrong ?? 0;
  if (correct === 0 && wrong === 0) return null;
  return (
    <div className="text-[12px] tracking-tab tabular-nums text-[color:var(--fg-faint)]">
      <span className="text-[color:var(--accent-progress)]">◯ {correct}</span>
      <span className="mx-1.5">·</span>
      <span className="text-[color:var(--accent-korean)]">✕ {wrong}</span>
    </div>
  );
}
