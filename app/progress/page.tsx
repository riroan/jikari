"use client";

import { useMemo } from "react";
import { useIsClient } from "@/lib/use-is-client";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { masteryLevel } from "@/lib/srs";
import type { KanjiCard } from "@/lib/types";

/**
 * Progress page — visualizes mastery of N5-N4 kanji pool.
 *
 * Full 2136 Joyo kanji grid is a v2 expansion (requires joyo-kanji npm package
 * to source the ordered list). v1 shows current N5-N4 scope.
 */

export default function ProgressPage() {
  const mounted = useIsClient();

  const states = useStore((s) => s.learningStates);
  const kanjiCards = useCardsStore((s) => s.kanji);

  // Single pass — earlier two filters scanned the deck twice.
  // Pre-hydration we return 0/0/0 instead of "all fresh" so the NEW chip
  // doesn't flicker (total → remaining) when the store rehydrates.
  const counts = useMemo(() => {
    if (!mounted) return { mastered: 0, learning: 0, fresh: 0 };
    let mastered = 0;
    let learning = 0;
    for (const c of kanjiCards) {
      const lvl = masteryLevel(states[`kanji:${c.id}`]);
      if (lvl === "mastered") mastered++;
      else if (lvl === "learning") learning++;
    }
    return {
      mastered,
      learning,
      fresh: kanjiCards.length - mastered - learning,
    };
  }, [mounted, states, kanjiCards]);
  const { mastered: masteredCount, learning: learningCount, fresh: freshCount } = counts;

  return (
    <ModePageShell title="進捗" headerMarginPx={40}>
      <section className="mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium">
              MASTERED
            </div>
            <div
              className="text-[40px] font-semibold tabular-nums leading-none"
              style={{
                fontFamily: "var(--font-jp-serif)",
                letterSpacing: "-0.03em",
                color: "var(--accent-progress)",
              }}
            >
              {masteredCount}
              <span className="text-lg text-[color:var(--fg-faint)] font-normal ml-1">
                / {kanjiCards.length}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium">
              LEARNING
            </div>
            <div
              className="text-[40px] font-semibold tabular-nums leading-none"
              style={{
                fontFamily: "var(--font-jp-serif)",
                letterSpacing: "-0.03em",
                color: "var(--fg-soft)",
              }}
            >
              {learningCount}
            </div>
            <div
              className="mt-2 text-caption text-[color:var(--fg-faint)] tabular-nums tracking-wide"
              aria-label={`미학습 ${freshCount}장`}
            >
              <span className="tracking-label font-medium">NEW</span>{" "}
              <span className="ml-1">{freshCount}</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="progress-grid-heading">
        <div
          id="progress-grid-heading"
          className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium"
        >
          N5 KANJI ({kanjiCards.length})
        </div>
        <ul role="list" className="grid grid-cols-10 gap-1">
          {kanjiCards.map((card) => (
            <li key={card.id}>
              <KanjiCell
                card={card}
                level={mounted ? masteryLevel(states[`kanji:${card.id}`]) : "new"}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 text-caption text-[color:var(--fg-faint)] leading-relaxed">
        <p>
          풀 상용한자 2136자 그리드는 v2 확장. 현재는 데이터에 있는 N5 범위({kanjiCards.length}자)만 표시.
        </p>
      </section>
    </ModePageShell>
  );
}

const LEVEL_LABEL_KO: Record<"new" | "learning" | "mastered", string> = {
  new: "미학습",
  learning: "학습 중",
  mastered: "마스터",
};

function KanjiCell({
  card,
  level,
}: {
  card: KanjiCard;
  level: "new" | "learning" | "mastered";
}) {
  const bg =
    level === "mastered"
      ? "color-mix(in oklab, var(--accent-progress) 65%, transparent)"
      : level === "learning"
      ? "color-mix(in oklab, var(--accent-progress) 25%, transparent)"
      : "color-mix(in oklab, var(--fg) 5%, transparent)";
  const color = level === "new" ? "var(--fg-faint)" : "var(--fg)";
  const meaning = card.meanings.slice(0, 2).join(", ");
  const ariaLabel = `${card.kanji}${meaning ? ` (${meaning})` : ""} — ${LEVEL_LABEL_KO[level]}`;
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      className="aspect-square flex items-center justify-center rounded-[2px] text-[18px] font-semibold"
      style={{
        fontFamily: "var(--font-jp-serif)",
        background: bg,
        color,
        letterSpacing: "-0.02em",
      }}
    >
      <span aria-hidden="true">{card.kanji}</span>
    </div>
  );
}
