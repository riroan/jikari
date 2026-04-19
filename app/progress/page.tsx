"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const states = useStore((s) => s.learningStates);
  const kanjiCards = useCardsStore((s) => s.kanji);

  const masteredCount = kanjiCards.filter(
    (c) => mounted && masteryLevel(states[`kanji:${c.id}`]) === "mastered"
  ).length;

  const learningCount = kanjiCards.filter(
    (c) => mounted && masteryLevel(states[`kanji:${c.id}`]) === "learning"
  ).length;

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
              {mounted ? masteredCount : 0}
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
              {mounted ? learningCount : 0}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium">
          N5 KANJI ({kanjiCards.length})
        </div>
        <div className="grid grid-cols-10 gap-1">
          {kanjiCards.map((card) => (
            <KanjiCell
              key={card.id}
              card={card}
              level={mounted ? masteryLevel(states[`kanji:${card.id}`]) : "new"}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 text-caption text-[color:var(--fg-faint)] leading-relaxed">
        <p>
          풀 상용한자 2136자 그리드는 v2 확장. 현재는 데이터에 있는 N5 범위({kanjiCards.length}자)만 표시.
        </p>
      </section>
    </ModePageShell>
  );
}

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
      : "rgba(26, 25, 21, 0.05)";
  const color = level === "new" ? "var(--fg-faint)" : "var(--fg)";
  return (
    <div
      title={`${card.kanji} — ${card.meanings.join(", ")} (${level})`}
      className="aspect-square flex items-center justify-center rounded-[2px] text-[18px] font-semibold"
      style={{
        fontFamily: "var(--font-jp-serif)",
        background: bg,
        color,
        letterSpacing: "-0.02em",
      }}
    >
      {card.kanji}
    </div>
  );
}
