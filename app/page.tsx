"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Heatmap } from "@/components/Heatmap";

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
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const heatmap = useStore((s) => s.heatmap);
  const currentStreak = useStore((s) => s.currentStreak);

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        {/* Top: brand + streak */}
        <header className="flex justify-between items-baseline mb-14">
          <div className="flex items-baseline">
            <h1
              className="text-[22px] leading-none font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              jikari
            </h1>
            <span className="ml-1.5 text-xs text-[color:var(--fg-faint)] tracking-tab">
              じかり
            </span>
          </div>
          <div
            className="text-[13px] text-[color:var(--fg-faint)] tracking-wider"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            <span className="text-[color:var(--accent-korean)] font-medium mr-1 tabular-nums">
              連続 {mounted ? currentStreak : 0}日
            </span>
          </div>
        </header>

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
        <nav className="flex justify-center items-center gap-1 text-caption text-[color:var(--fg-faint)] tracking-caption font-medium">
          <Link
            href="/"
            className="inline-flex items-center justify-center min-h-[44px] px-3 hover:text-[color:var(--fg-soft)]"
          >
            HOME
          </Link>
          <span aria-hidden="true">・</span>
          <Link
            href="/chapters"
            className="inline-flex items-center justify-center min-h-[44px] px-3 hover:text-[color:var(--fg-soft)]"
          >
            UNITS
          </Link>
          <span aria-hidden="true">・</span>
          <Link
            href="/progress"
            className="inline-flex items-center justify-center min-h-[44px] px-3 hover:text-[color:var(--fg-soft)]"
          >
            PROGRESS
          </Link>
          <span aria-hidden="true">・</span>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center min-h-[44px] px-3 hover:text-[color:var(--fg-soft)]"
          >
            SETTINGS
          </Link>
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
      className="text-[13px] text-[color:var(--fg-soft)] tracking-wide px-3 py-2 rounded-sm hover:bg-[color:var(--bg-deep)] hover:text-[color:var(--fg)] transition-colors min-h-[44px] flex items-center"
    >
      {label}
    </Link>
  );
}
