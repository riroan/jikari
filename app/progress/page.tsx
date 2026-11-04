"use client";

import { useMemo, useState } from "react";
import { useIsClient, useClientNow } from "@/lib/use-is-client";
import { ModePageShell } from "@/components/ModePageShell";
import { Heatmap } from "@/components/Heatmap";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { masteryLevel } from "@/lib/srs";
import { INITIAL_RATING, ratingBand } from "@/lib/rating";
import { weakCardIds } from "@/lib/weak";
import { forecastDue } from "@/lib/forecast";
import { subjectMastery, sumMastery } from "@/lib/subject-mastery";
import { RubyText } from "@/components/Furigana";
import Link from "next/link";
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

const WEAK_LIMIT = 5;
const WEAK_COLLAPSED = 3;

interface WeakRow {
  id: string;
  front: string;
  ruby?: string;
  answer: string;
}

const WEAK_SUBJECTS = [
  { ko: "한자", href: "/kanji", mode: "kanji" },
  { ko: "단어", href: "/vocab", mode: "vocab" },
  { ko: "문장", href: "/sentence", mode: "sentence" },
  { ko: "일상표현", href: "/expressions", mode: "expression" },
] as const;

export default function ProgressPage() {
  const mounted = useIsClient();
  const [weakOpen, setWeakOpen] = useState<Record<string, boolean>>({});

  const states = useStore((s) => s.learningStates);
  const ratings = useStore((s) => s.ratings);
  const heatmap = useStore((s) => s.heatmap);
  const kanjiCards = useCardsStore((s) => s.kanji);
  const cards = useCardsStore();

  const weak = useMemo(() => {
    if (!mounted) return [];
    const rowOf: Record<string, (id: string) => WeakRow | undefined> = {
      kanji: (id) => {
        const c = cards.kanjiById.get(id);
        return c && { id, front: c.kanji, answer: c.koreanMeaning || c.meanings[0] || "" };
      },
      vocab: (id) => {
        const c = cards.vocabById.get(id);
        return c && { id, front: c.word, ruby: c.ruby, answer: c.koreanMeanings.join(", ") };
      },
      sentence: (id) => {
        const c = cards.sentenceById.get(id);
        return c && { id, front: c.blank, ruby: c.blankRuby, answer: c.translation };
      },
      expression: (id) => {
        const c = cards.expressionById.get(id);
        return c && { id, front: c.expression_jp, ruby: c.ruby, answer: c.translation_ko };
      },
    };
    const pools: Record<string, string[]> = {
      kanji: cards.kanjiIds,
      vocab: cards.vocabIds,
      sentence: cards.sentenceIds,
      expression: cards.expressionIds,
    };
    return WEAK_SUBJECTS.map((subj) => {
      const ids = weakCardIds(states, subj.mode, new Set(pools[subj.mode]));
      const rows = ids
        .slice(0, WEAK_LIMIT)
        .map(rowOf[subj.mode])
        .filter((r): r is WeakRow => r !== undefined);
      return { ...subj, total: ids.length, rows };
    }).filter((w) => w.total > 0);
  }, [mounted, states, cards]);

  // Single pass — earlier two filters scanned the deck twice.
  // Pre-hydration we return 0/0/0 instead of "all fresh" so the NEW chip
  // doesn't flicker (total → remaining) when the store rehydrates.
  const now = useClientNow();
  const forecast = useMemo(
    () => forecastDue(now === null ? {} : states, now ?? 0),
    [now, states],
  );


  const subjects = useMemo(() => {
    if (!mounted) return [];
    const pools = [
      { ko: "한자", mode: "kanji", ids: cards.kanjiIds },
      { ko: "단어", mode: "vocab", ids: cards.vocabIds },
      { ko: "문장", mode: "sentence", ids: cards.sentenceIds },
      { ko: "일상표현", mode: "expression", ids: cards.expressionIds },
    ] as const;
    return pools
      .filter((p) => p.ids.length > 0)
      .map((p) => ({ ko: p.ko, ...subjectMastery(states, p.mode, p.ids) }));
  }, [mounted, states, cards]);

  // 머리 숫자는 전 과목 합계. 예전엔 한자만 셌는데 라벨이 없어 전체 진도로 읽혔고,
  // 바로 아래 BY SUBJECT의 한자 행과 숫자가 똑같았다. Pre-hydration엔 subjects가
  // 비어 0/0/0 — NEW 칩이 깜빡이지 않는다.
  const counts = useMemo(() => sumMastery(subjects), [subjects]);
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
                / {counts.total}
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

      {subjects.length > 0 && (
        <section className="mb-8" aria-labelledby="progress-subjects-heading">
          <div
            id="progress-subjects-heading"
            className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium"
          >
            BY SUBJECT
          </div>
          <ul role="list">
            {subjects.map((s) => (
              <li
                key={s.ko}
                className="py-2.5 border-t border-[color:var(--line)]"
                style={{ minHeight: 44 }}
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-body text-[color:var(--fg)]">{s.ko}</span>
                  <span
                    className="text-body tabular-nums text-[color:var(--accent-progress-text)]"
                    aria-label={`마스터 ${s.mastered}장, 전체 ${s.total}장`}
                  >
                    {s.mastered}
                    <span className="text-caption text-[color:var(--fg-faint)]"> / {s.total}</span>
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1.5 flex h-[3px] overflow-hidden rounded-[1px]"
                  style={{ background: "color-mix(in oklab, var(--fg) 5%, transparent)" }}
                >
                  <span style={{ width: `${(s.mastered / s.total) * 100}%`, background: "color-mix(in oklab, var(--accent-progress) 65%, transparent)" }} />
                  <span style={{ width: `${(s.learning / s.total) * 100}%`, background: "color-mix(in oklab, var(--accent-progress) 25%, transparent)" }} />
                </div>
                <div className="mt-1 text-caption text-[color:var(--fg-faint)] tabular-nums">
                  학습 중 {s.learning} · 미학습 {s.fresh}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8" aria-labelledby="progress-forecast-heading">
        <div
          id="progress-forecast-heading"
          className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium"
        >
          FORECAST
        </div>
        <ul role="list">
          {(
            [
              ["오늘", forecast.today],
              ["내일", forecast.tomorrow],
              ["7일 내", forecast.week],
            ] as const
          ).map(([label, n]) => (
            <li
              key={label}
              className="flex items-baseline justify-between gap-4 py-2.5 border-t border-[color:var(--line)]"
              style={{ minHeight: 44 }}
            >
              <span className="text-body text-[color:var(--fg)]">{label}</span>
              <span className="text-body tabular-nums text-[color:var(--fg-soft)]">{n}장</span>
            </li>
          ))}
        </ul>
      </section>

      {weak.length > 0 && (
        <section className="mb-8" aria-labelledby="progress-weak-heading">
          <div
            id="progress-weak-heading"
            className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium"
          >
            WEAK
          </div>
          {weak.map((w) => (
            <div key={w.mode} className="border-t border-[color:var(--line)]">
              <div className="flex items-center justify-between min-h-[44px]">
                <span className="text-body text-[color:var(--fg)]">
                  {w.ko}{" "}
                  <span className="text-caption text-[color:var(--fg-faint)] tabular-nums">
                    {w.total}
                  </span>
                </span>
                <Link
                  href={`${w.href}?weak=1`}
                  aria-label={`${w.ko} 약점 복습`}
                  className="inline-flex items-center min-h-[44px] pl-3 text-caption tracking-wider text-[color:var(--accent-progress-text)] font-medium"
                >
                  약점 복습 →
                </Link>
              </div>
              <ul role="list">
                {(weakOpen[w.mode] ? w.rows : w.rows.slice(0, WEAK_COLLAPSED)).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-baseline justify-between gap-4 min-h-[44px] py-2 border-t border-[color:var(--line)]"
                  >
                    <span
                      lang="ja"
                      className="text-em font-semibold shrink-0 max-w-[55%]"
                      style={{ fontFamily: "var(--font-jp-serif)", color: "var(--fg)" }}
                    >
                      {r.ruby ? <RubyText text={r.ruby} /> : r.front}
                    </span>
                    <span className="text-caption text-[color:var(--fg-soft)] text-right leading-snug">
                      {r.answer}
                    </span>
                  </li>
                ))}
              </ul>
              {w.rows.length > WEAK_COLLAPSED && (
                <button
                  type="button"
                  aria-expanded={!!weakOpen[w.mode]}
                  onClick={() => setWeakOpen((o) => ({ ...o, [w.mode]: !o[w.mode] }))}
                  className="w-full min-h-[44px] border-t border-[color:var(--line)] text-caption tracking-wider text-[color:var(--fg-soft)] hover:text-[color:var(--fg)]"
                >
                  {weakOpen[w.mode] ? "접기" : `더 보기 (${w.rows.length - WEAK_COLLAPSED})`}
                </button>
              )}
            </div>
          ))}
        </section>
      )}

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

      <section aria-labelledby="progress-grid-heading">
        <div
          id="progress-grid-heading"
          className="text-xs text-[color:var(--fg-faint)] tracking-label mb-3 font-medium"
        >
          KANJI ({kanjiCards.length})
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
          상용한자 2,136자 중 지금 학습 데이터에 있는 {kanjiCards.length}자를 보여줘요.
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
