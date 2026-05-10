"use client";

import { useMemo } from "react";
import { useClientNow } from "@/lib/use-is-client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { Heatmap } from "@/components/Heatmap";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { toLocalDateKey } from "@/lib/heatmap";

/**
 * Home structure (post plan-design-review 2026-04-19):
 * one row per subject with 공부 / 퀴즈 buttons on the right.
 * Replaces the previous two-section layout (공부 / 퀴즈) which was
 * growing linearly with each new mode.
 */
/**
 * `dueKey` is the lookup key into the per-mode due-count map. Most subjects
 * map 1:1 to a SRS mode, but /sentence and /particle share the same SRS
 * mode ("sentence") and have to be split by their card-id list — those two
 * use composite keys ("sentence_vocab" / "sentence_particle").
 */
const SUBJECTS: ReadonlyArray<{
  ko: string;
  jp: string;
  base: string;
  dueKey: string;
}> = [
  { ko: "한자", jp: "漢字", base: "/kanji", dueKey: "kanji" },
  { ko: "단어", jp: "単語", base: "/vocab", dueKey: "vocab" },
  { ko: "문장", jp: "文章", base: "/sentence", dueKey: "sentence_vocab" },
  { ko: "조사", jp: "助詞", base: "/particle", dueKey: "sentence_particle" },
  { ko: "동사활용", jp: "活用", base: "/conjugation", dueKey: "conjugation" },
  { ko: "형용사", jp: "形容詞", base: "/adjective", dueKey: "adjective" },
  { ko: "문법", jp: "文法", base: "/grammar", dueKey: "grammar" },
  { ko: "일상표현", jp: "表現", base: "/expressions", dueKey: "expression" },
];

export default function Home() {
  // useClientNow() returns null on the server / before hydration, so it
  // doubles as the "have we hydrated" gate — no separate useIsClient
  // call needed here.
  const now = useClientNow();
  const hydrated = now !== null;

  const heatmap = useStore((s) => s.heatmap);
  const currentStreak = useStore((s) => s.currentStreak);
  const learningStates = useStore((s) => s.learningStates);
  const sentenceIds = useCardsStore((s) => s.sentenceIds);
  const particleIds = useCardsStore((s) => s.particleIds);

  const todayCount = hydrated ? heatmap[toLocalDateKey(now)] ?? 0 : 0;
  const studiedToday = todayCount > 0;

  // Per-subject due breakdown. New (never-reviewed) cards are excluded —
  // they're effectively unbounded and would drown the signal. /sentence
  // and /particle share SRS mode "sentence", so they're split out by
  // matching against the card-id lists from cards-store.
  const dueByKey = useMemo<Record<string, number>>(() => {
    if (!hydrated || now === null) return {};
    const counts: Record<string, number> = {};
    const sentenceVocabSet = new Set(sentenceIds);
    const sentenceParticleSet = new Set(particleIds);
    for (const s of Object.values(learningStates)) {
      if (s.lastReviewed === 0 || s.nextDue > now) continue;
      if (s.mode === "sentence") {
        if (sentenceVocabSet.has(s.cardId)) {
          counts.sentence_vocab = (counts.sentence_vocab ?? 0) + 1;
        } else if (sentenceParticleSet.has(s.cardId)) {
          counts.sentence_particle = (counts.sentence_particle ?? 0) + 1;
        }
        continue;
      }
      counts[s.mode] = (counts[s.mode] ?? 0) + 1;
    }
    return counts;
  }, [learningStates, hydrated, now, sentenceIds, particleIds]);

  // Total due across all subjects, kept for the header chip.
  const dueCount = useMemo(
    () => Object.values(dueByKey).reduce((a, b) => a + b, 0),
    [dueByKey],
  );

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-full max-w-[390px] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-8 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {/* Top: brand + streak */}
        <header className="flex justify-between items-baseline mb-6">
          <div className="flex items-baseline">
            <h1
              className="text-title leading-none font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              jikari
            </h1>
            <span className="ml-1.5 text-xs text-[color:var(--fg-faint)] tracking-tab">
              じかり
            </span>
          </div>
          <div
            className="text-caption text-[color:var(--fg-faint)] tracking-wider text-right flex flex-col items-end gap-0.5"
            style={{ fontFamily: "var(--font-jp-sans)" }}
            aria-label={
              !hydrated
                ? undefined
                : `${
                    studiedToday
                      ? `${currentStreak}일 연속 학습, 오늘 ${todayCount}장`
                      : currentStreak > 0
                        ? `${currentStreak}일 연속 학습, 오늘 아직 시작 안 함`
                        : "연속 학습 없음"
                  }${dueCount > 0 ? `, 복습 대기 ${dueCount}장` : ""}`
            }
          >
            <span
              className={`font-medium tabular-nums ${
                studiedToday
                  ? "text-[color:var(--accent-korean)]"
                  : "text-[color:var(--fg-faint)]"
              }`}
            >
              連続 {hydrated ? currentStreak : 0}日
            </span>
            {hydrated && dueCount > 0 && (
              <span
                className="text-[11px] text-[color:var(--fg-soft)] tabular-nums tracking-wide"
                aria-hidden="true"
              >
                復習 {dueCount}
              </span>
            )}
          </div>
        </header>

        {/* Units entry — chapter mastery view (uses subject-row visual language) */}
        <Link
          href="/chapters"
          className="flex items-center justify-between bg-[color:var(--bg)] border border-[color:var(--line)] rounded-sm px-4 py-3 mb-8 min-h-[44px] hover:bg-[color:var(--bg-deep)] transition-colors"
        >
          <span className="flex items-baseline gap-3">
            <span className="text-body font-medium text-[color:var(--fg)]">
              단원
            </span>
            <span
              className="text-label text-[color:var(--fg-faint)] tracking-[0.08em]"
              style={{ fontFamily: "var(--font-jp-sans)" }}
            >
              単元
            </span>
          </span>
          <span className="text-caption text-[color:var(--fg-soft)] tracking-wide">
            →
          </span>
        </Link>

        {/* Subject rows — one per subject with 공부 / 퀴즈 actions */}
        <section className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden mb-12">
          {SUBJECTS.map((s) => (
            <SubjectRow
              key={s.base}
              {...s}
              dueCount={dueByKey[s.dueKey] ?? 0}
            />
          ))}
        </section>

        {/* Heatmap */}
        <section className="mb-10">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2.5 font-medium">
            7 WEEKS
          </div>
          {hydrated ? <Heatmap data={heatmap} /> : <div style={{ height: "14px" }} />}
        </section>

        {/* Footer nav */}
        <nav className="flex flex-wrap justify-center items-center gap-1 text-caption text-[color:var(--fg-faint)] tracking-caption font-medium">
          <Link
            href="/"
            aria-current="page"
            className="inline-flex items-center justify-center min-h-[44px] px-2 text-[color:var(--fg-soft)] cursor-default"
          >
            HOME
          </Link>
          <span aria-hidden="true">・</span>
          <Link
            href="/progress"
            className="inline-flex items-center justify-center min-h-[44px] px-2 hover:text-[color:var(--fg-soft)]"
          >
            PROGRESS
          </Link>
          <span aria-hidden="true">・</span>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center min-h-[44px] px-2 hover:text-[color:var(--fg-soft)]"
          >
            SETTINGS
          </Link>
          <span aria-hidden="true">・</span>
          <ThemeCycleButton />
        </nav>
      </div>
    </main>
  );
}

function SubjectRow({
  ko,
  jp,
  base,
  dueCount,
}: {
  ko: string;
  jp: string;
  base: string;
  dueCount: number;
}) {
  return (
    <div className="bg-[color:var(--bg)] flex items-center px-4 py-4">
      <div className="flex-1 flex items-baseline gap-3 min-w-0">
        <span className="text-body font-medium text-[color:var(--fg)] truncate">
          {ko}
        </span>
        <span
          className="text-label text-[color:var(--fg-faint)] tracking-[0.08em]"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {jp}
        </span>
        {dueCount > 0 && (
          <span
            className="text-[11px] tabular-nums tracking-wide text-[color:var(--accent-progress)] font-medium"
            aria-label={`복습 ${dueCount}장 대기`}
          >
            ・{dueCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ActionLink href={`${base}?mode=study`} label="공부" />
        <ActionLink href={base} label="퀴즈" />
      </div>
    </div>
  );
}

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-caption text-[color:var(--fg-soft)] tracking-wide px-4 py-3 rounded-sm hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--fg)] transition-colors min-h-[44px] flex items-center"
    >
      {label}
    </Link>
  );
}
