"use client";

/**
 * Home page header — brand on the left, streak + 復習 chip on the right.
 * Pure presentation: caller derives the four numeric props (hydrated,
 * studiedToday, currentStreak, todayCount, dueCount) from store/heatmap
 * and we just render the resulting chips.
 */
export function HomeHeader({
  hydrated,
  studiedToday,
  currentStreak,
  todayCount,
  dueCount,
}: {
  hydrated: boolean;
  studiedToday: boolean;
  currentStreak: number;
  todayCount: number;
  dueCount: number;
}) {
  return (
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
            className="text-tiny text-[color:var(--accent-progress)] font-medium tabular-nums tracking-wide"
            aria-hidden="true"
          >
            復習 {dueCount}
          </span>
        )}
      </div>
    </header>
  );
}
