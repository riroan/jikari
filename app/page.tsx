"use client";

import { useIsClient, useClientNow } from "@/lib/use-is-client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Heatmap } from "@/components/Heatmap";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { toLocalDateKey } from "@/lib/heatmap";

/**
 * Home structure (post plan-design-review 2026-04-19):
 * one row per subject with 공부 / 퀴즈 buttons on the right.
 * Replaces the previous two-section layout (공부 / 퀴즈) which was
 * growing linearly with each new mode.
 */
const SUBJECTS: ReadonlyArray<{ ko: string; jp: string; base: string }> = [
  { ko: "한자", jp: "漢字", base: "/kanji" },
  { ko: "단어", jp: "単語", base: "/vocab" },
  { ko: "문장", jp: "文章", base: "/sentence" },
  { ko: "조사", jp: "助詞", base: "/particle" },
  { ko: "동사활용", jp: "活用", base: "/conjugation" },
  { ko: "형용사", jp: "形容詞", base: "/adjective" },
  { ko: "문법", jp: "文法", base: "/grammar" },
  { ko: "일상표현", jp: "表現", base: "/expressions" },
];

export default function Home() {
  const mounted = useIsClient();
  const now = useClientNow();

  const heatmap = useStore((s) => s.heatmap);
  const currentStreak = useStore((s) => s.currentStreak);

  const todayCount = now !== null ? heatmap[toLocalDateKey(now)] ?? 0 : 0;
  const studiedToday = mounted && todayCount > 0;

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
            className="text-caption text-[color:var(--fg-faint)] tracking-wider"
            style={{ fontFamily: "var(--font-jp-sans)" }}
            aria-label={
              !mounted
                ? undefined
                : studiedToday
                ? `${currentStreak}일 연속 학습, 오늘 ${todayCount}장`
                : currentStreak > 0
                ? `${currentStreak}일 연속 학습, 오늘 아직 시작 안 함`
                : "연속 학습 없음"
            }
          >
            <span
              className={`font-medium mr-1 tabular-nums ${
                studiedToday
                  ? "text-[color:var(--accent-korean)]"
                  : "text-[color:var(--fg-faint)]"
              }`}
            >
              連続 {mounted ? currentStreak : 0}日
            </span>
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
            <SubjectRow key={s.base} {...s} />
          ))}
        </section>

        {/* Heatmap */}
        <section className="mb-10">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2.5 font-medium">
            7 WEEKS
          </div>
          {mounted ? <Heatmap data={heatmap} /> : <div style={{ height: "14px" }} />}
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
}: {
  ko: string;
  jp: string;
  base: string;
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
