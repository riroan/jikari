"use client";

import Link from "next/link";

/**
 * Home page header — brand on the left, streak + 復習 chip on the right.
 * Pure presentation: caller derives the numeric props (hydrated,
 * studiedToday, weekDays, todayCount, dueCount, welcomeBackCount) from store/heatmap
 * and we just render the resulting chips.
 */
export function HomeHeader({
  hydrated,
  studiedToday,
  weekDays,
  todayCount,
  dueCount,
  welcomeBackCount = 0,
}: {
  hydrated: boolean;
  studiedToday: boolean;
  /** Days studied in the last 7 (rolling, today included). */
  weekDays: number;
  todayCount: number;
  dueCount: number;
  /** >0 after a 3+ day gap: shows one quiet welcome-back line. */
  welcomeBackCount?: number;
}) {
  return (
    <>
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
            : `최근 7일 중 ${weekDays}일 학습${
                studiedToday ? `, 오늘 ${todayCount}장` : ", 오늘 아직 시작 안 함"
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
          7일 중 {hydrated ? weekDays : 0}일
        </span>
        {hydrated && dueCount > 0 && (
          <span
            className="text-tiny text-[color:var(--accent-progress-text)] font-medium tabular-nums tracking-wide"
            aria-hidden="true"
          >
            復習 {dueCount}
          </span>
        )}
      </div>
    </header>
    {hydrated && welcomeBackCount > 0 && (
      <Link
        href="/review"
        className="-mt-3 mb-3 flex items-center min-h-11 text-tiny tracking-wide text-[color:var(--fg-faint)]"
      >
        오랜만이에요. 오늘은 조금만 해도 충분해요
      </Link>
    )}
    </>
  );
}
