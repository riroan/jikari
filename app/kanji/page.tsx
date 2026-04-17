"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuizCard } from "@/components/QuizCard";
import { useStore } from "@/lib/store";
import {
  KANJI_IDS,
  generateKanjiChoices,
  getKanji,
} from "@/lib/data";
import { cardKey, getTodayQueue, newLearningState } from "@/lib/srs";
import type { KanjiCard } from "@/lib/types";

type QType = "on" | "kun";

export default function KanjiQuizPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const review = useStore((s) => s.review);
  const learningStates = useStore((s) => s.learningStates);
  const settings = useStore((s) => s.settings);

  const [seed, setSeed] = useState(() => Date.now());

  // Compute queue via useMemo — avoid method selector returning new objects
  const queue = useMemo(() => {
    const now = Date.now();
    const states = KANJI_IDS.map(
      (id) => learningStates[cardKey("kanji", id)] ?? newLearningState("kanji", id, now)
    );
    return getTodayQueue(states, now, settings);
    // seed is included to reshuffle after each review
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, learningStates, settings]);

  const nextCard: KanjiCard | undefined = useMemo(() => {
    const pool = [...queue.due, ...queue.new];
    if (pool.length === 0) return undefined;
    const pick = pool[0];
    return getKanji(pick.cardId);
  }, [queue]);

  // Decide which reading to ask — prefer whichever has readings
  const qType: QType = useMemo(() => {
    if (!nextCard) return "on";
    if (nextCard.onReadings.length > 0 && nextCard.kunReadings.length > 0) {
      // Alternate based on seed
      return seed % 2 === 0 ? "on" : "kun";
    }
    return nextCard.onReadings.length > 0 ? "on" : "kun";
  }, [nextCard, seed]);

  const choices = useMemo(() => {
    if (!nextCard) return null;
    return generateKanjiChoices(nextCard, qType, seed);
  }, [nextCard, qType, seed]);

  if (!mounted) {
    return (
      <main className="flex-1 flex justify-center">
        <div className="w-[390px] px-6 pt-8 pb-10">
          <PageHeader />
        </div>
      </main>
    );
  }

  if (!nextCard || !choices) {
    return (
      <main className="flex-1 flex justify-center">
        <div className="w-[390px] px-6 pt-8 pb-10">
          <PageHeader />
          <EmptyState />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <PageHeader />

        <QuizCard
          question={
            <div
              className="text-[148px] leading-none font-semibold"
              style={{
                fontFamily: "var(--font-jp-serif)",
                letterSpacing: "-0.02em",
                color: "var(--fg)",
              }}
            >
              {nextCard.kanji}
            </div>
          }
          subtitle={qType === "on" ? "音読み" : "訓読み"}
          choices={choices.choices}
          correct={choices.correct}
          back={
            <KanjiBack card={nextCard} />
          }
          onResolved={(wasCorrect) => {
            review("kanji", nextCard.id, wasCorrect);
            setSeed(Date.now());
          }}
        />
      </div>
    </main>
  );
}

function PageHeader() {
  return (
    <header className="flex justify-between items-baseline mb-10">
      <Link href="/" className="text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]">
        ← HOME
      </Link>
      <h1
        className="text-[15px] tracking-[0.15em] text-[color:var(--fg-soft)]"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        漢字
      </h1>
    </header>
  );
}

function EmptyState() {
  return (
    <div className="mt-20 text-center">
      <div
        className="text-[64px] font-semibold mb-4"
        style={{ fontFamily: "var(--font-jp-serif)", color: "var(--fg-faint)" }}
      >
        —
      </div>
      <p className="text-sm text-[color:var(--fg-soft)] leading-relaxed">
        오늘 한자 카드가 없습니다. 내일 다시 오세요.
      </p>
      <Link
        href="/"
        className="inline-block mt-6 px-4 py-2 text-sm text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)]"
      >
        홈으로
      </Link>
    </div>
  );
}

function KanjiBack({ card }: { card: KanjiCard }) {
  return (
    <div
      className="flex flex-col gap-4 text-[color:var(--fg-soft)]"
      style={{ fontFamily: "var(--font-jp-sans)" }}
    >
      {/* Same size as front — no visual jump on flip */}
      <div
        className="text-[148px] leading-none font-semibold"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}
      >
        {card.kanji}
      </div>
      <div className="flex flex-col gap-1.5 pl-1">
        {card.onReadings.length > 0 && (
          <div className="flex gap-3.5 items-baseline">
            <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
              音
            </span>
            <span className="text-[17px] text-[color:var(--fg-soft)]">
              {card.onReadings.join(" ・ ")}
            </span>
          </div>
        )}
        {card.kunReadings.length > 0 && (
          <div className="flex gap-3.5 items-baseline">
            <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
              訓
            </span>
            <span className="text-[17px] text-[color:var(--fg-soft)]">
              {card.kunReadings.join(" ・ ")}
            </span>
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-dashed border-[color:var(--line)] flex gap-2.5 items-baseline">
          <span
            className="text-xs font-semibold tracking-[0.1em] text-[color:var(--accent-korean)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            韓
          </span>
          <span className="text-[14px] text-[color:var(--fg-soft)]">
            {card.koreanMeaning} {card.koreanSound.join("·")}
            {card.koreanHanja !== card.kanji && (
              <span className="ml-2 text-[color:var(--fg-faint)] text-xs">
                ({card.koreanHanja})
              </span>
            )}
          </span>
        </div>
        <div className="text-[12px] text-[color:var(--fg-faint)] leading-relaxed mt-1">
          {card.meanings.join(", ")}
        </div>
      </div>
    </div>
  );
}
