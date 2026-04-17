"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Heatmap } from "@/components/Heatmap";

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
            <span
              className="text-[22px] font-semibold tracking-wide"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              jikari
            </span>
            <span className="ml-1.5 text-xs text-[color:var(--fg-faint)] tracking-[0.15em]">
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

        {/* 공부 section */}
        <SectionHeader ko="공부" jp="勉強" />
        <section className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden mb-10">
          <EntryRow href="/kanji?mode=study" ko="한자" jp="漢字" />
          <EntryRow href="/vocab?mode=study" ko="단어" jp="単語" />
          <EntryRow href="/sentence?mode=study" ko="문장" jp="文章" />
        </section>

        {/* 퀴즈 section */}
        <SectionHeader ko="퀴즈" jp="問題" />
        <section className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden mb-12">
          <EntryRow href="/kanji" ko="한자" jp="漢字" />
          <EntryRow href="/vocab" ko="단어" jp="単語" />
          <EntryRow href="/sentence" ko="문장" jp="文章" />
        </section>

        {/* Heatmap */}
        <section className="mb-10">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-2.5 font-medium">
            7 WEEKS
          </div>
          {mounted ? <Heatmap data={heatmap} /> : <div style={{ height: "14px" }} />}
        </section>

        {/* Footer nav */}
        <nav className="text-center text-[11px] text-[color:var(--fg-faint)] tracking-[0.25em] font-medium">
          <Link href="/" className="hover:text-[color:var(--fg-soft)]">
            HOME
          </Link>{" "}
          ・{" "}
          <Link href="/progress" className="hover:text-[color:var(--fg-soft)]">
            PROGRESS
          </Link>{" "}
          ・{" "}
          <Link href="/settings" className="hover:text-[color:var(--fg-soft)]">
            SETTINGS
          </Link>
        </nav>
      </div>
    </main>
  );
}

function SectionHeader({ ko, jp }: { ko: string; jp: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-3 px-1">
      <span className="text-[15px] font-medium tracking-wide text-[color:var(--fg)]">
        {ko}
      </span>
      <span
        className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.15em]"
        style={{ fontFamily: "var(--font-jp-sans)" }}
      >
        {jp}
      </span>
    </div>
  );
}

function EntryRow({ href, ko, jp }: { href: string; ko: string; jp: string }) {
  return (
    <Link
      href={href}
      className="block bg-[color:var(--bg)] px-4 py-5 flex justify-between items-center hover:bg-[color:var(--bg-deep)] transition-colors"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-[17px] font-medium text-[color:var(--fg)]">{ko}</span>
        <span
          className="text-[13px] text-[color:var(--fg-faint)] tracking-[0.08em]"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {jp}
        </span>
      </div>
      <span className="text-[color:var(--fg-faint)]">→</span>
    </Link>
  );
}
