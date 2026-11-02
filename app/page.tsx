"use client";

import { useMemo } from "react";
import { useClientNow } from "@/lib/use-is-client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Heatmap } from "@/components/Heatmap";
import { HomeHeader } from "@/components/HomeHeader";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { currentStreak as computeStreak, toLocalDateKey } from "@/lib/heatmap";
import { topDueKey, totalDue } from "@/lib/due";
import { useDueByKey } from "@/lib/use-due-by-key";

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

  const todayCount = hydrated ? heatmap[toLocalDateKey(now)] ?? 0 : 0;
  const studiedToday = todayCount > 0;
  // Recompute streak live so the chip stays accurate even if the user
  // opens the app on a new day without reviewing yet (the persisted
  // store.currentStreak only updates on review).
  const currentStreak = useMemo(
    () => (hydrated ? computeStreak(heatmap, now) : 0),
    [hydrated, heatmap, now],
  );

  const dueByKey = useDueByKey();
  const dueCount = useMemo(() => totalDue(dueByKey), [dueByKey]);
  // 한 번에 시작할 곳 — 복습이 제일 많이 쌓인 과목. 모드 8개를 하나씩 열어
  // 보지 않아도 오늘 할 일이 바로 시작된다.
  const nextReview = useMemo(() => {
    const top = topDueKey(
      dueByKey,
      SUBJECTS.map((s) => s.dueKey),
    );
    const subject = top && SUBJECTS.find((s) => s.dueKey === top.key);
    return top && subject ? { subject, count: top.count } : null;
  }, [dueByKey]);

  return (
    <main className="flex-1 flex justify-center pl-[var(--safe-left)] pr-[var(--safe-right)]">
      <div className="w-full max-w-[390px] px-6 pt-[calc(var(--safe-top)+2rem)] pb-[max(2.5rem,var(--safe-bottom))]">
        <HomeHeader
          hydrated={hydrated}
          studiedToday={studiedToday}
          currentStreak={currentStreak}
          todayCount={todayCount}
          dueCount={dueCount}
        />

        {nextReview && (
          <Link
            href={nextReview.subject.base}
            className="flex items-center justify-between gap-3 border border-[color:var(--accent-progress)] rounded-sm px-4 py-3 mb-3 min-h-[44px] hover:bg-[color:var(--bg-deep)] transition-colors"
          >
            <span className="flex items-baseline gap-3">
              <span className="text-body font-medium text-[color:var(--fg)]">
                오늘의 복습
              </span>
              <span className="text-caption text-[color:var(--accent-progress)] tracking-tab tabular-nums">
                復習 {dueCount}
              </span>
            </span>
            <span className="text-caption text-[color:var(--fg-soft)] tracking-wide whitespace-nowrap">
              {nextReview.subject.ko}부터 →
            </span>
          </Link>
        )}

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
      {/*
        폭이 좁을 때(Safari 페이지 확대 125% ≈ 322px, 디스플레이 확대) 일본어 표기와
        개수 칩이 한 글자씩 줄바꿈되고 이름이 잘렸다. 표기·칩은 줄바꿈 없이
        고정하고, 이름만 마지막 수단으로 줄어든다.
      */}
      <div className="flex-1 flex items-baseline gap-2 min-w-0">
        <span className="text-body font-medium text-[color:var(--fg)] truncate">
          {ko}
        </span>
        <span
          className="text-label text-[color:var(--fg-faint)] tracking-[0.08em] whitespace-nowrap shrink-0"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {jp}
        </span>
        {dueCount > 0 && (
          <span
            className="text-tiny tabular-nums tracking-wide text-[color:var(--accent-progress)] font-medium whitespace-nowrap shrink-0"
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
      className="text-caption text-[color:var(--fg-soft)] tracking-wide px-3 py-3 rounded-sm hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--fg)] transition-colors min-h-[44px] min-w-[44px] justify-center flex items-center"
    >
      {label}
    </Link>
  );
}
