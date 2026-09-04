"use client";

import { useMemo } from "react";
import { useIsClient } from "@/lib/use-is-client";
import { ModePageShell } from "@/components/ModePageShell";
import { Heatmap } from "@/components/Heatmap";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { masteryLevel } from "@/lib/srs";
import { INITIAL_RATING, ratingBand } from "@/lib/rating";
import type { KanjiCard } from "@/lib/types";

/**
 * Progress page — visualizes mastery of N5-N4 kanji pool.
 *
 * Full 2136 Joyo kanji grid is a v2 expansion (requires joyo-kanji npm package
 * to source the ordered list). v1 shows current N5-N4 scope.
 */

/**
 * Subjects whose quiz actually feeds an adaptive rating (see lib/rating.ts).
 * 조사 shares the "sentence" rating with 문장, so it is not a row of its own.
 * 활용 / 형용사 rate the *form* rather than the card — see
 * conjugationFormDifficulty in lib/rating.ts.
 */
const RATED_SUBJECTS: readonly { ko: string; jp: string; key: string }[] = [
  { ko: "한자", jp: "漢字", key: "kanji" },
  { ko: "단어", jp: "単語", key: "vocab" },
  { ko: "문장", jp: "文章", key: "sentence" },
  { ko: "문법", jp: "文法", key: "grammar" },
  { ko: "일상표현", jp: "表現", key: "expression" },
  { ko: "활용", jp: "活用", key: "conjugation" },
  { ko: "형용사", jp: "形容", key: "adjective" },
];

export default function ProgressPage() {
  const mounted = useIsClient();

  const states = useStore((s) => s.learningStates);
  const ratings = useStore((s) => s.ratings);
  const heatmap = useStore((s) => s.heatmap);
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

      <section className="mb-8" aria-labelledby="progress-year-heading">
        <div
          id="progress-year-heading"
          className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2.5 font-medium"
        >
          26 WEEKS
        </div>
        {/* 26 weeks (half year) keeps cells ≥ 10px on a 390px viewport so
            individual days stay tappable / readable. Home keeps the
            tighter 7-week view; progress is the zoom-out. */}
        {mounted ? (
          <Heatmap data={heatmap} weeks={26} />
        ) : (
          <div style={{ height: "14px" }} />
        )}
      </section>

      <section className="mb-8" aria-labelledby="progress-level-heading">
        <div
          id="progress-level-heading"
          className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium"
        >
          LEVEL
        </div>
        <ul role="list">
          {RATED_SUBJECTS.map(({ ko, jp, key }) => {
            // Pre-hydration the store still holds initialState, so every row
            // would read N5 — show the resting value rather than a wrong one.
            const rating = mounted ? ratings[key] ?? INITIAL_RATING : INITIAL_RATING;
            return (
              <li
                key={`${key}:${ko}`}
                className="flex items-baseline justify-between gap-4 py-2.5 border-t border-[color:var(--line)]"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-body text-[color:var(--fg)]">{ko}</span>
                  <span
                    className="text-caption text-[color:var(--fg-faint)]"
                    style={{ fontFamily: "var(--font-jp-serif)" }}
                  >
                    {jp}
                  </span>
                </span>
                <span className="flex items-baseline gap-2.5">
                  <span
                    className="text-body tabular-nums text-[color:var(--fg-soft)]"
                    style={{ fontFamily: "var(--font-jp-serif)" }}
                  >
                    {Math.round(rating)}
                  </span>
                  <span className="text-caption tracking-label text-[color:var(--fg-faint)] w-[18px] text-right">
                    N{ratingBand(rating)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
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
      className="aspect-square flex items-center justify-center rounded-[2px] text-em font-semibold"
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
