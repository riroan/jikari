"use client";

import { useMemo } from "react";
import { useClientNow } from "@/lib/use-is-client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Heatmap } from "@/components/Heatmap";
import { HomeHeader } from "@/components/HomeHeader";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { daysSinceLastStudy, daysStudiedInLast, toLocalDateKey } from "@/lib/heatmap";
import { splitDue, topDueKey, totalDue } from "@/lib/due";
import { REVIEW_DUE_KEYS } from "@/lib/review-deck";
import { useDueByKey } from "@/lib/use-due-by-key";
import { SUBJECTS } from "@/lib/subjects";
import { forecastDue } from "@/lib/forecast";
import { DailyPhrase } from "@/components/DailyPhrase";
import { useLiveMisses } from "@/lib/use-misses";

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
  const weekDays = useMemo(
    () => (hydrated ? daysStudiedInLast(heatmap, now, 7) : 0),
    [hydrated, heatmap, now],
  );

  const learningStates = useStore((s) => s.learningStates);
  const tomorrow = useMemo(
    () => (hydrated ? forecastDue(learningStates, now).tomorrow : 0),
    [hydrated, learningStates, now],
  );
  const dueByKey = useDueByKey();
  const missCount = useLiveMisses().length;
  const dueCount = useMemo(() => totalDue(dueByKey), [dueByKey]);
  const { today: dueToday, backlog } = splitDue(dueCount, DAILY_GOAL);
  // 3일 이상 쉬었고 복습할 게 있을 때만 (첫 사용·할 일 없음 제외) 조용한 한 줄.
  const gap = hydrated ? daysSinceLastStudy(heatmap, now) : null;
  const welcomeBackCount =
    gap !== null && gap >= 3 && Object.keys(learningStates).length > 0
      ? Math.min(10, dueCount)
      : 0;
  // 한 번에 시작할 곳 — 복습이 제일 많이 쌓인 과목. 모드 8개를 하나씩 열어
  // 보지 않아도 오늘 할 일이 바로 시작된다.
  const nextReview = useMemo(() => {
    const top = topDueKey(
      dueByKey,
      SUBJECTS.map((s) => s.dueKey),
    );
    const subject = top && SUBJECTS.find((s) => s.dueKey === top.key);
    if (!top || !subject) return null;
    // 한자·단어·문장·문법 중 due가 있으면 섞어서 한 번에 (/review).
    const mixed = REVIEW_DUE_KEYS.some((k) => (dueByKey[k] ?? 0) > 0);
    return { subject, count: top.count, mixed };
  }, [dueByKey]);

  return (
    <main className="flex-1 flex justify-center pl-[var(--safe-left)] pr-[var(--safe-right)]">
      <div className="w-full max-w-[390px] px-6 pt-[calc(var(--safe-top)+2rem)] pb-[calc(max(2.5rem,var(--safe-bottom))_+_var(--sync-gap))]">
        <HomeHeader
          hydrated={hydrated}
          studiedToday={studiedToday}
          weekDays={weekDays}
          todayCount={todayCount}
          dueCount={dueCount}
          welcomeBackCount={welcomeBackCount}
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
              ? !nextReview && tomorrow > 0
                ? `오늘 목표 달성 · 오늘은 여기까지 — 내일 복습 ${tomorrow}장`
                : "오늘 목표 달성"
              : `오늘 ${todayCount} / ${DAILY_GOAL}`}
          </div>
        </div>

        {nextReview && (
          <Link
            href={nextReview.mixed ? "/review" : nextReview.subject.base}
            className="flex items-center justify-between gap-3 bg-[color:var(--accent-progress)] text-[color:var(--on-progress)] rounded-sm px-4 py-4 mb-3 min-h-[56px] active:opacity-80 transition-opacity"
          >
            <span className="flex items-baseline gap-3">
              <span className="text-body font-semibold">
                오늘의 복습
              </span>
              <span className="text-caption tracking-tab tabular-nums">
                {dueToday}장
              </span>
            </span>
            <span className="text-caption tracking-wide whitespace-nowrap">
              {nextReview.mixed ? "섞어서 →" : `${nextReview.subject.ko}부터 →`}
            </span>
          </Link>
        )}
        {nextReview && backlog > 0 && (
          <p className="-mt-1 mb-3 text-tiny tabular-nums tracking-wide text-[color:var(--fg-faint)]">
            밀린 복습 {backlog}장
            {dueCount > DAILY_GOAL * 8 && (
              <Link href="/settings#backlog" className="inline-flex items-center min-h-11 px-2 underline underline-offset-2">
                정리하기 →
              </Link>
            )}
          </p>
        )}

        {hydrated && !nextReview && todayCount === 0 &&
          Object.keys(learningStates).length === 0 && (
          <Link
            href="/vocab?mode=study"
            className="flex items-center justify-between gap-3 bg-[color:var(--accent-progress)] text-[color:var(--on-progress)] rounded-sm px-4 py-4 mb-3 min-h-[56px] active:opacity-80 transition-opacity"
          >
            <span className="text-body font-semibold">처음이라면 단어 공부부터</span>
            <span className="text-caption tracking-wide">→</span>
          </Link>
        )}

        {/*
          보조 진입점. 예전엔 떨어진 테두리 상자 5개라 좁은 폭(≈322px)에서 과목 행이
          첫 화면 밖으로 밀렸다. DESIGN.md의 EntryRow 어휘대로 과목 목록과 같은
          "구분선으로 나뉜 행 묶음" 하나로 그린다.
        */}
        <nav
          aria-label="더 공부하기"
          className="flex flex-col gap-px bg-[color:var(--line)] border border-[color:var(--line)] rounded-sm overflow-hidden mb-8"
        >
          {[
            { href: "/chapters", ko: "단원", jp: "単元" },
            { href: "/mix", ko: "종합 퀴즈", jp: "混合" },
            { href: "/build", ko: "문장 만들기", jp: "組立" },
            ...(missCount > 0
              ? [{ href: "/mistakes", ko: "오답 노트", jp: "誤答", trail: `${missCount}장 →` }]
              : []),
            { href: "/reading", ko: "문장 읽기", jp: "音読" },
          ].map((e) => (
            <EntryRow key={e.href} {...e} />
          ))}
        </nav>

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

        {hydrated && <DailyPhrase dateKey={toLocalDateKey(now)} />}

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
        <nav className="-mx-5 flex justify-between items-center whitespace-nowrap text-caption text-[color:var(--fg-faint)] tracking-[0.01em] min-[360px]:tracking-[0.06em] font-medium">
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
      {/* 칩은 이름 아래 둘째 줄에 쌓는다: iOS 실기기 폰트가 넓어도 이름이 잘리지 않는다. */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-body font-medium text-[color:var(--fg)]">
            {ko}
          </span>
          <span
            lang="ja"
            className="text-label text-[color:var(--fg-faint)] tracking-[0.08em] whitespace-nowrap"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            {jp}
          </span>
        </div>
        {dueCount > 0 && (
          <div className="text-tiny tabular-nums tracking-wide text-[color:var(--accent-progress-text)] font-medium whitespace-nowrap">
            {dueCount}장 대기
          </div>
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

function EntryRow({
  href,
  ko,
  jp,
  trail = "→",
}: {
  href: string;
  ko: string;
  jp: string;
  trail?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between bg-[color:var(--bg)] px-4 py-3 min-h-[44px] hover:bg-[color:var(--bg-deep)] active:bg-[color:var(--bg-deep)] transition-colors"
    >
      <span className="flex items-baseline gap-3">
        <span className="text-body font-medium text-[color:var(--fg)]">{ko}</span>
        <span
          className="text-label text-[color:var(--fg-faint)] tracking-[0.08em]"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {jp}
        </span>
      </span>
      <span className="text-caption tabular-nums text-[color:var(--fg-soft)] tracking-wide">
        {trail}
      </span>
    </Link>
  );
}
