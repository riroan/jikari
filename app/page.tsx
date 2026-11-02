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
import { SUBJECTS } from "@/lib/subjects";

/**
 * Home structure (post plan-design-review 2026-04-19):
 * one row per subject with 공부 / 퀴즈 buttons on the right.
 * Replaces the previous two-section layout (공부 / 퀴즈) which was
 * growing linearly with each new mode.
 */
export default function Home() {
  // useClientNow() returns null on the server / before hydration, so it
  // doubles as the "have we hydrated" gate — no separate useIsClient
  // call needed here.
  const now = useClientNow();
  const hydrated = now !== null;

  const heatmap = useStore((s) => s.heatmap);
  const DAILY_GOAL = useStore((s) => s.settings.dailyGoal);

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

        <div
          role="progressbar"
          aria-label="오늘 학습 목표"
          aria-valuemin={0}
          aria-valuemax={DAILY_GOAL}
          aria-valuenow={Math.min(todayCount, DAILY_GOAL)}
          className="mb-4"
        >
          <div className="h-px bg-[color:var(--line)]">
            <div
              className="h-px bg-[color:var(--accent-progress)] transition-[width]"
              style={{ width: `${Math.min(todayCount / DAILY_GOAL, 1) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-tiny tabular-nums tracking-wide text-[color:var(--fg-faint)]">
            {todayCount >= DAILY_GOAL
              ? "오늘 목표 달성"
              : `오늘 ${todayCount} / ${DAILY_GOAL}`}
          </div>
        </div>

        {nextReview && (
          <Link
            href={nextReview.subject.base}
            className="flex items-center justify-between gap-3 bg-[color:var(--accent-progress)] text-[color:var(--on-progress)] rounded-sm px-4 py-4 mb-3 min-h-[56px] active:opacity-80 transition-opacity"
          >
            <span className="flex items-baseline gap-3">
              <span className="text-body font-semibold">
                오늘의 복습
              </span>
              <span className="text-caption tracking-tab tabular-nums">
                {dueCount}장 대기
              </span>
            </span>
            <span className="text-caption tracking-wide whitespace-nowrap">
              {nextReview.subject.ko}부터 →
            </span>
          </Link>
        )}

        {/* Units entry — chapter mastery view (uses subject-row visual language) */}
        <Link
          href="/chapters"
          className="flex items-center justify-between bg-[color:var(--bg)] border border-[color:var(--line)] rounded-sm px-4 py-3 mb-8 min-h-[44px] hover:bg-[color:var(--bg-deep)] active:bg-[color:var(--bg-deep)] transition-colors"
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
        <section className="mb-8">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2.5 font-medium">
            7 WEEKS
            <span className="ml-2 font-normal tracking-wide">
              칸 하나 = 하루 · 테두리 = 오늘
            </span>
          </div>
          {hydrated ? (
            <div className="max-w-[210px]">
              <Heatmap data={heatmap} />
            </div>
          ) : <div style={{ height: "14px" }} />}
        </section>

        {/* Footer nav */}
        <nav className="flex justify-center items-center text-caption text-[color:var(--fg-faint)] tracking-caption font-medium">
          <Link
            href="/"
            aria-current="page"
            className="inline-flex items-center justify-center min-h-[44px] px-1 text-[color:var(--fg-soft)] cursor-default"
          >
            HOME
          </Link>
          <Link
            href="/progress"
            className="inline-flex items-center justify-center min-h-[44px] px-1 hover:text-[color:var(--fg-soft)]"
          >
            PROGRESS
          </Link>
          <Link
            href="/search"
            className="min-w-[44px] inline-flex items-center justify-center min-h-[44px] px-1 hover:text-[color:var(--fg-soft)]"
          >
            検索
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center min-h-[44px] px-1 hover:text-[color:var(--fg-soft)]"
          >
            SETTINGS
          </Link>
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
    <div className="relative bg-[color:var(--bg)] flex items-center px-4 py-4 active:bg-[color:var(--bg-deep)] transition-colors">
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
          lang="ja"
          className="text-label text-[color:var(--fg-faint)] tracking-[0.08em] whitespace-nowrap shrink-0"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {jp}
        </span>
        {dueCount > 0 && (
          <span className="text-tiny tabular-nums tracking-wide text-[color:var(--accent-progress-text)] font-medium whitespace-nowrap shrink-0">
            {dueCount}장 대기
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {base !== "/listening" && (
          <ActionLink href={`${base}?mode=study`} label="공부" subject={ko} />
        )}
        <ActionLink href={base} label="퀴즈" subject={ko} stretch />
      </div>
    </div>
  );
}

function ActionLink({
  href,
  label,
  subject,
  stretch,
}: {
  href: string;
  label: string;
  subject: string;
  stretch?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={`${subject} ${label}`}
      className={`text-caption tracking-wide px-3 py-3 rounded-sm active:bg-[color:var(--bg-deep)] hover:text-[color:var(--fg)] transition-colors min-h-[44px] min-w-[44px] justify-center flex items-center ${
        stretch
          ? "text-[color:var(--fg)] after:absolute after:inset-0 after:content-['']"
          : "relative z-10 text-[color:var(--fg-faint)]"
      }`}
    >
      {label}
    </Link>
  );
}
