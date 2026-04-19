"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { aggregateChapterMastery } from "@/lib/chapter-mastery";
import { intensityBg, ratioToIntensity } from "@/lib/intensity";
import type { CardMode } from "@/lib/types";

/**
 * Home-page chapter mastery strip.
 *
 * Renders one row per chapter. Each row's color intensity reflects the
 * fraction of member cards at SRS box ≥ 4 ("mastered" per lib/srs.ts).
 *
 * Hierarchy: chapter name (Korean) → progress bar → "% / N" caption.
 * No card icons. No badges. No competing accents — `--accent-progress`
 * (sage in light, gold in dark) is the single signal channel.
 *
 * Empty state: render nothing if chapters is empty (DB not seeded yet).
 */
export function ChapterMastery({ mounted = true }: { mounted?: boolean }) {
  const chapters = useCardsStore((s) => s.chapters);
  const membersByChapter = useCardsStore((s) => s.membersByChapter);
  const kanjiById = useCardsStore((s) => s.kanjiById);
  const vocabById = useCardsStore((s) => s.vocabById);
  const sentenceById = useCardsStore((s) => s.sentenceById);
  const grammarById = useCardsStore((s) => s.grammarById);
  const learningStates = useStore((s) => s.learningStates);

  // Build the data view. Recomputes only when sources change (not on hover).
  const rows = useMemo(() => {
    if (chapters.length === 0) return [];

    const cardExists = (mode: CardMode, cardId: string): boolean => {
      switch (mode) {
        case "kanji":
          return kanjiById.has(cardId);
        case "vocab":
          return vocabById.has(cardId);
        case "sentence":
          return sentenceById.has(cardId);
        case "grammar":
          return grammarById.has(cardId);
        case "conjugation":
        case "adjective":
          // Conjugation/adjective derive from vocab (verbs, adjectives).
          // chapter_members shouldn't reference these directly.
          return false;
      }
    };

    const getBox = (mode: CardMode, cardId: string) => {
      const key = `${mode}:${cardId}`;
      return learningStates[key]?.box ?? 1;
    };

    const grammarLookup = (id: string) => grammarById.get(id);

    return chapters.map((chapter) => {
      const members = membersByChapter.get(chapter.id) ?? [];
      const summary = aggregateChapterMastery(
        members,
        cardExists,
        getBox,
        grammarLookup,
      );
      return { chapter, summary };
    });
  }, [
    chapters,
    membersByChapter,
    kanjiById,
    vocabById,
    sentenceById,
    grammarById,
    learningStates,
  ]);

  if (chapters.length === 0) return null;

  return (
    <section
      className="mb-12 flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden"
      aria-labelledby="chapters-label"
    >
      <div
        id="chapters-label"
        className="bg-[color:var(--bg)] px-4 pt-3 pb-2 text-xs text-[color:var(--fg-faint)] tracking-label font-medium"
      >
        UNITS
      </div>

      <ul className="flex flex-col gap-px bg-[color:var(--line)]">
        {rows.map(({ chapter, summary }) => {
          const percent = mounted ? Math.round(summary.ratio * 100) : 0;
          const intensity = mounted ? ratioToIntensity(summary.ratio) : 0;
          const memberCount = summary.validMembers;

          return (
            <li
              key={chapter.id}
              className="bg-[color:var(--bg)] flex items-center px-4 py-2.5 gap-3"
            >
              <span className="flex-1 text-small text-[color:var(--fg)] truncate min-w-0">
                {chapter.name}
              </span>

              {/* Mastery bar — fixed width, fills proportionally. */}
              <div
                className="relative shrink-0 h-1.5 w-20 rounded-full overflow-hidden"
                style={{ background: intensityBg(0) }}
                role="img"
                aria-label={`마스터리 ${percent}퍼센트, ${summary.masteredCount} / ${memberCount} 카드`}
              >
                <div
                  className="absolute inset-y-0 left-0 transition-[width] duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, percent))}%`,
                    background: intensityBg(intensity),
                  }}
                />
              </div>

              <span
                className="shrink-0 text-caption text-[color:var(--fg-faint)] tabular-nums w-14 text-right"
                aria-hidden="true"
              >
                {memberCount > 0 ? `${percent}% · ${memberCount}` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
