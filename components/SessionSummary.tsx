"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SUBJECTS } from "@/lib/subjects";
import { topDueKey } from "@/lib/due";
import { useDueByKey } from "@/lib/use-due-by-key";
import { useStore } from "@/lib/store";
import { useClientNow } from "@/lib/use-is-client";
import { forecastDue } from "@/lib/forecast";
import { toLocalDateKey } from "@/lib/heatmap";
import { useLiveMisses } from "@/lib/use-misses";
import type { RunSummary } from "@/lib/quiz-run";
import { rankOf } from "@/lib/progression";

/** 이번 판 XP 한 줄 + 승급했으면 도장(判子) 한 번. 폭죽 없음 (DESIGN.md Quiet over loud). */
function XpLine({ from }: { from: number }) {
  const xp = useStore((s) => s.progression?.xp ?? 0);
  const gained = xp - from;
  if (gained <= 0) return null;
  const rank = rankOf(xp);
  const promoted = rankOf(from).index < rank.index;
  return (
    <div className="mt-3 flex items-center gap-3">
      {promoted && (
        <span
          className="anim-pop-in inline-flex items-center justify-center px-2 py-1 border-2 border-[color:var(--accent-korean)] text-[color:var(--accent-korean)] text-body font-semibold rounded-sm"
          style={{ fontFamily: "var(--font-jp-serif)" }}
        >
          {rank.name}
        </span>
      )}
      <Link href="/rewards" className="text-caption tabular-nums text-[color:var(--fg-faint)] min-h-11 inline-flex items-center">
        +{gained} XP
        {promoted ? " · 승급" : rank.next ? ` · ${rank.next.name}까지 ${(rank.next.xp - xp).toLocaleString("ko-KR")}` : ""}
      </Link>
    </div>
  );
}

const font = (s: string) =>
  /[가-힣]/.test(s) ? "var(--font-kr-sans)" : "var(--font-jp-sans)";

const btn =
  "inline-flex items-center justify-center px-4 text-caption tracking-tab border rounded-sm transition-colors";

export function SessionSummary({
  summary,
  onRetry,
  onNext,
  breakdown,
}: {
  summary: RunSummary;
  onRetry: () => void;
  onNext: () => void;
  /** 과목별 정답 한 줄 (종합 퀴즈). */
  breakdown?: string;
}) {
  const { total, correct, accuracy, bestStreak, missed } = summary;
  const ref = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const dueByKey = useDueByKey();
  // 다른 과목에 복습이 남아 있으면 홈을 거치지 않고 바로 이어간다.
  const others = SUBJECTS.filter((s) => !pathname.startsWith(s.base));
  const top = topDueKey(dueByKey, others.map((s) => s.dueKey));
  const nextSubject = top && others.find((s) => s.dueKey === top.key);
  // 조용한 마무리: 오늘 분량·내일 예정은 저장된 SRS 기록 그대로다.
  // 재시도/비-SRS 판은 review()를 안 부르므로 숫자가 늘지 않는다.
  const learningStates = useStore((s) => s.learningStates);
  const heatmap = useStore((s) => s.heatmap);
  const goal = useStore((s) => s.settings.dailyGoal);
  const now = useClientNow();
  const missCount = useLiveMisses().length;
  const today = now === null ? 0 : (heatmap[toLocalDateKey(now)] ?? 0);
  const tomorrow = now === null ? 0 : forecastDue(learningStates, now).tomorrow;
  const reached = now !== null && today >= goal;
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  return (
    <section
      // ModePageShell이 이 표식을 보고 하단 "홈으로"를 숨긴다 — 요약에 이미 있다.
      data-session-summary=""
      ref={ref}
      tabIndex={-1}
      className="flex flex-col gap-6 outline-none"
      aria-label="세션 요약"
    >
      <div role="status">
        <div
          className="text-[44px] leading-none font-semibold tabular-nums text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-jp-serif)", letterSpacing: "-0.03em" }}
        >
          {accuracy}
          <span className="text-body text-[color:var(--fg-faint)]">%</span>
        </div>
        <p className="mt-2 text-caption tracking-tab tabular-nums text-[color:var(--fg-faint)]">
          {total}문제 중 {correct}개 정답 · 최고 연속 {bestStreak}
        </p>
        {breakdown && (
          <p className="mt-1 text-caption tabular-nums text-[color:var(--fg-faint)]">
            {breakdown}
          </p>
        )}
        {summary.xpStart !== undefined && <XpLine from={summary.xpStart} />}
      </div>

      {missed.length > 0 ? (
        <div>
          <h2 className="text-xs tracking-label font-medium text-[color:var(--fg-faint)] mb-2">
            틀린 것 {missed.length}
          </h2>
          <ul className="border-t border-[color:var(--line)]">
            {missed.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 border-b border-[color:var(--line)]"
              >
                <span
                  className="text-body text-[color:var(--fg)]"
                  style={{ fontFamily: font(m.front) }}
                >
                  {m.front}
                </span>
                <span
                  className="text-body text-right ml-auto text-[color:var(--accent-progress-text)]"
                  style={{ fontFamily: font(m.back) }}
                >
                  {m.back}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-body text-[color:var(--fg-soft)]">모두 맞혔어요.</p>
      )}

      <div className="flex flex-col gap-2 pb-[max(0rem,var(--safe-bottom))]">
        {reached && (
          <Link
            href="/"
            style={{ minHeight: 44 }}
            className={`${btn} border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)]`}
          >
            홈으로
          </Link>
        )}
        {nextSubject && top && (
          <Link
            href={nextSubject.base}
            style={{ minHeight: 44 }}
            className={`${btn} ${
              reached
                ? "border-[color:var(--line)] text-[color:var(--fg-soft)]"
                : "border-[color:var(--fg)] text-[color:var(--fg)]"
            } hover:bg-[color:var(--bg-deep)]`}
          >
            다음 복습: {nextSubject.ko} {top.count}장 →
          </Link>
        )}
        {missed.length > 0 && (
          <button
            type="button"
            onClick={onRetry}
            style={{ minHeight: 44 }}
            className={`${btn} ${
              nextSubject || reached
                ? "border-[color:var(--line)] text-[color:var(--fg-soft)]"
                : "border-[color:var(--fg)] text-[color:var(--fg)]"
            } hover:bg-[color:var(--bg-deep)]`}
          >
            틀린 것만 다시
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          style={{ minHeight: 44 }}
          className={`${btn} ${
            reached
              ? "border-transparent text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]"
              : "border-[color:var(--line)] text-[color:var(--fg-soft)] hover:bg-[color:var(--bg-deep)]"
          }`}
        >
          {reached ? "더 풀기" : "계속하기"}
        </button>
        {!reached && (
          <Link
            href="/"
            style={{ minHeight: 44 }}
            className={`${btn} border-transparent text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]`}
          >
            홈으로
          </Link>
        )}
        {now !== null && (
          <p className="mt-1 pt-3 border-t border-[color:var(--line)] flex flex-wrap items-baseline justify-between gap-x-4 text-caption tabular-nums text-[color:var(--fg-faint)]">
            <span>
              오늘 {today}/{goal} · 내일 예정 {tomorrow}장
            </span>
            {missCount > 0 && (
              <Link href="/mistakes" className="underline underline-offset-4 hover:text-[color:var(--fg)]">
                오답 노트 {missCount}
              </Link>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
