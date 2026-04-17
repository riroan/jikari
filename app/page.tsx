"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import {
  KANJI_CARDS,
  KANJI_IDS,
  VOCAB_IDS,
  SENTENCE_IDS,
  pickRandom,
} from "@/lib/data";
import { Heatmap } from "@/components/Heatmap";
import { cardKey, getTodayQueue, newLearningState } from "@/lib/srs";
import type { CardMode } from "@/lib/types";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Read raw state atomically — avoid method selectors that return new objects
  const heatmap = useStore((s) => s.heatmap);
  const currentStreak = useStore((s) => s.currentStreak);
  const learningStates = useStore((s) => s.learningStates);
  const settings = useStore((s) => s.settings);

  // Kanji of the day — deterministic per calendar day
  const kanjiOfTheDay = useMemo(() => {
    if (!mounted) return KANJI_CARDS[0];
    const d = new Date();
    const seed = d.getFullYear() * 1000 + d.getMonth() * 50 + d.getDate();
    return pickRandom(KANJI_CARDS, seed) ?? KANJI_CARDS[0];
  }, [mounted]);

  // Compute queue counts via useMemo — no new objects in selectors
  const counts = useMemo(() => {
    if (!mounted) return { kanji: 0, vocab: 0, sentence: 0 };
    const now = Date.now();
    const countFor = (mode: CardMode, ids: string[]) => {
      const states = ids.map(
        (id) => learningStates[cardKey(mode, id)] ?? newLearningState(mode, id, now)
      );
      const q = getTodayQueue(states, now, settings);
      return q.due.length + q.new.length;
    };
    return {
      kanji: countFor("kanji", KANJI_IDS),
      vocab: countFor("vocab", VOCAB_IDS),
      sentence: countFor("sentence", SENTENCE_IDS),
    };
  }, [mounted, learningStates, settings]);

  const totalToday = counts.kanji + counts.vocab + counts.sentence;

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        {/* Top: brand + streak */}
        <header className="flex justify-between items-baseline mb-12">
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

        {/* Hero: kanji of the day */}
        <section className="mb-14">
          <div
            className="text-[156px] leading-none font-semibold mb-5"
            style={{
              fontFamily: "var(--font-jp-serif)",
              letterSpacing: "-0.02em",
              color: "var(--fg)",
            }}
          >
            {kanjiOfTheDay.kanji}
          </div>
          <div
            className="flex flex-col gap-1.5 pl-1"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            {kanjiOfTheDay.onReadings.length > 0 && (
              <div className="flex gap-3.5 items-baseline">
                <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
                  音
                </span>
                <span className="text-[17px] text-[color:var(--fg-soft)]">
                  {kanjiOfTheDay.onReadings.join(" ・ ")}
                </span>
              </div>
            )}
            {kanjiOfTheDay.kunReadings.length > 0 && (
              <div className="flex gap-3.5 items-baseline">
                <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
                  訓
                </span>
                <span className="text-[17px] text-[color:var(--fg-soft)]">
                  {kanjiOfTheDay.kunReadings.join(" ・ ")}
                </span>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-dashed border-[color:var(--line)] flex gap-2.5 items-baseline">
              <span
                className="text-xs font-semibold tracking-[0.1em] text-[color:var(--accent-korean)]"
                style={{ fontFamily: "var(--font-jp-serif)" }}
              >
                韓
              </span>
              <span className="text-sm text-[color:var(--fg-soft)]">
                {kanjiOfTheDay.koreanMeaning} {kanjiOfTheDay.koreanSound.join("·")}
              </span>
            </div>
          </div>
        </section>

        {/* Today */}
        <section className="mb-10">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-1.5 font-medium">
            TODAY
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-[48px] font-semibold tabular-nums"
              style={{
                fontFamily: "var(--font-jp-serif)",
                letterSpacing: "-0.03em",
                color: "var(--fg)",
              }}
            >
              {mounted ? totalToday : 0}
            </span>
            <span className="text-base text-[color:var(--fg-soft)]">
              cards ready
            </span>
          </div>
        </section>

        {/* Entries */}
        <section className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden mb-12">
          <EntryRow href="/kanji" ko="한자" jp="漢字" count={counts.kanji} />
          <EntryRow href="/vocab" ko="단어" jp="単語" count={counts.vocab} />
          <EntryRow href="/sentence" ko="문장" jp="文章" count={counts.sentence} />
        </section>

        {/* Heatmap */}
        <section className="mb-10">
          <div className="text-xs text-[color:var(--fg-faint)] tracking-[0.18em] mb-2.5 font-medium">
            7 WEEKS
          </div>
          {mounted ? (
            <Heatmap data={heatmap} />
          ) : (
            <div style={{ height: "14px" }} />
          )}
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

function EntryRow({
  href,
  ko,
  jp,
  count,
}: {
  href: string;
  ko: string;
  jp: string;
  count: number;
}) {
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
      <span
        className="text-[13px] text-[color:var(--fg-faint)] tabular-nums"
        style={{ fontFamily: "var(--font-jp-sans)" }}
      >
        {count}
      </span>
    </Link>
  );
}
