"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { aggregateChapterMastery } from "@/lib/chapter-mastery";
import { intensityBg, ratioToIntensity } from "@/lib/intensity";
import { useClientNow } from "@/lib/use-is-client";
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
export type ChapterSort = "default" | "mastery-asc" | "due-desc";

export function ChapterMastery({
  mounted = true,
  sort = "default",
}: {
  mounted?: boolean;
  sort?: ChapterSort;
}) {
  const chapters = useCardsStore((s) => s.chapters);
  const membersByChapter = useCardsStore((s) => s.membersByChapter);
  const kanjiById = useCardsStore((s) => s.kanjiById);
  const vocabById = useCardsStore((s) => s.vocabById);
  const sentenceById = useCardsStore((s) => s.sentenceById);
  const grammarById = useCardsStore((s) => s.grammarById);
  const learningStates = useStore((s) => s.learningStates);
  const now = useClientNow();

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
        case "expression":
          // expression cards are not yet in chapter_members (v1 scope). When
          // chapter integration lands, add expressionById lookup here.
          return false;
      }
    };

    const getBox = (mode: CardMode, cardId: string) => {
      const key = `${mode}:${cardId}`;
      return learningStates[key]?.box ?? 1;
    };

    const grammarLookup = (id: string) => grammarById.get(id);

    // For grammar members the SRS key is grammar:pattern:{id} or
    // grammar:particle:{id} per ChapterQuizCard. Mirror that here so the
    // due count picks the right rows out of learningStates.
    const stateKeyFor = (mode: CardMode, cardId: string): string => {
      if (mode !== "grammar") return `${mode}:${cardId}`;
      const card = grammarLookup(cardId);
      if (!card) return `grammar:${cardId}`;
      const sub = card.type === "pattern" ? "pattern" : "particle";
      return `grammar:${sub}:${card.id}`;
    };

    return chapters.map((chapter) => {
      const members = membersByChapter.get(chapter.id) ?? [];
      const summary = aggregateChapterMastery(
        members,
        cardExists,
        getBox,
        grammarLookup,
      );
      let dueCount = 0;
      if (now !== null) {
        for (const m of members) {
          if (!cardExists(m.mode, m.cardId)) continue;
          const s = learningStates[stateKeyFor(m.mode, m.cardId)];
          if (s && s.lastReviewed > 0 && s.nextDue <= now) dueCount++;
        }
      }
      return { chapter, summary, dueCount };
    });
  }, [
    chapters,
    membersByChapter,
    kanjiById,
    vocabById,
    sentenceById,
    grammarById,
    learningStates,
    now,
  ]);

  // Sort is a *view* concern only — derive a copy so the underlying
  // `rows` reference stays stable and downstream memoization isn't busted.
  const sortedRows = useMemo(() => {
    if (sort === "default" || !mounted) return rows;
    const copy = [...rows];
    if (sort === "mastery-asc") {
      copy.sort((a, b) => a.summary.ratio - b.summary.ratio);
    } else if (sort === "due-desc") {
      copy.sort((a, b) => b.dueCount - a.dueCount);
    }
    return copy;
  }, [rows, sort, mounted]);

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
        {sortedRows.map(({ chapter, summary, dueCount }) => {
          const percent = mounted ? Math.round(summary.ratio * 100) : 0;
          const intensity = mounted ? ratioToIntensity(summary.ratio) : 0;
          const memberCount = summary.validMembers;
          const showDue = mounted && dueCount > 0;
          // ≥ 95% counts as "달성" — leaves a small head-room so a single
          // demoted card mid-streak doesn't drop the chapter out of the
          // mastered category every other day.
          const mastered = mounted && memberCount > 0 && summary.ratio >= 0.95;

          return (
            <li key={chapter.id}>
              <Link
                href={`/chapters/${chapter.id}`}
                className="bg-[color:var(--bg)] flex items-center px-4 py-2.5 gap-3 min-h-[44px] hover:bg-[color:var(--bg-deep)] transition-colors"
                aria-label={`${chapter.name} — ${
                  mastered ? "달성, " : ""
                }마스터리 ${percent}퍼센트, ${summary.masteredCount} / ${memberCount} 카드${
                  showDue ? `, 복습 ${dueCount}장 대기` : ""
                }`}
              >
                <span className="flex-1 flex items-baseline gap-2 min-w-0">
                  <span className="text-small text-[color:var(--fg)] truncate min-w-0">
                    {chapter.name}
                  </span>
                  {mastered && !showDue && (
                    <span
                      className="shrink-0 text-tiny tracking-wide text-[color:var(--accent-progress)]"
                      aria-hidden="true"
                      style={{ fontFamily: "var(--font-jp-serif)" }}
                    >
                      達
                    </span>
                  )}
                  {showDue && (
                    <span
                      className="shrink-0 text-tiny tabular-nums tracking-wide text-[color:var(--accent-progress)] font-medium"
                      aria-hidden="true"
                    >
                      ・{dueCount}
                    </span>
                  )}
                </span>

                {/* Mastery bar — fixed width, fills proportionally. */}
                <div
                  className="relative shrink-0 h-1.5 w-20 rounded-full overflow-hidden"
                  style={{ background: intensityBg(0) }}
                  aria-hidden="true"
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
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
