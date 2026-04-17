"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuizCard } from "@/components/QuizCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import {
  VOCAB_IDS,
  generateVocabChoices,
  getVocab,
} from "@/lib/data";
import { cardKey, getTodayQueue, newLearningState } from "@/lib/srs";
import type { VocabCard } from "@/lib/types";

export default function VocabQuizPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const review = useStore((s) => s.review);
  const learningStates = useStore((s) => s.learningStates);
  const settings = useStore((s) => s.settings);

  const [seed, setSeed] = useState(() => Date.now());

  const queue = useMemo(() => {
    const now = Date.now();
    const states = VOCAB_IDS.map(
      (id) => learningStates[cardKey("vocab", id)] ?? newLearningState("vocab", id, now)
    );
    return getTodayQueue(states, now, settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, learningStates, settings]);

  const nextCard: VocabCard | undefined = useMemo(() => {
    const pool = [...queue.due, ...queue.new];
    if (pool.length === 0) return undefined;
    return getVocab(pool[0].cardId);
  }, [queue]);

  const choices = useMemo(() => {
    if (!nextCard) return null;
    return generateVocabChoices(nextCard, seed);
  }, [nextCard, seed]);

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
            <div>
              <div
                className="text-[56px] leading-tight font-semibold mb-2"
                style={{
                  fontFamily: "var(--font-jp-serif)",
                  letterSpacing: "-0.02em",
                  color: "var(--fg)",
                  // Ruby font-size is relative (0.45em of parent) — parent 56px ⇒ rt 25px, good
                }}
              >
                {nextCard.ruby ? (
                  <RubyText text={nextCard.ruby} />
                ) : (
                  nextCard.word
                )}
              </div>
              {!nextCard.ruby && (
                <div
                  className="text-[16px] text-[color:var(--fg-faint)]"
                  style={{ fontFamily: "var(--font-jp-sans)" }}
                >
                  {nextCard.reading}
                </div>
              )}
            </div>
          }
          subtitle="의미는?"
          choiceFontFamily="var(--font-kr-sans)"
          choices={choices.choices}
          correct={choices.correct}
          back={<VocabBack card={nextCard} />}
          onResolved={(wasCorrect) => {
            review("vocab", nextCard.id, wasCorrect);
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
        単語
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
        오늘 단어 카드가 없습니다. 내일 다시 오세요.
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

function VocabBack({ card }: { card: VocabCard }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Same size as front — same word, same visual weight */}
      <div
        className="text-[56px] leading-tight font-semibold"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}
      >
        {card.ruby ? <RubyText text={card.ruby} /> : card.word}
      </div>
      {!card.ruby && (
        <div
          className="text-[16px] text-[color:var(--fg-faint)]"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {card.reading}
        </div>
      )}
      <div className="text-[18px] text-[color:var(--fg)] leading-relaxed font-medium mt-1">
        {card.koreanMeanings.join(", ")}
      </div>
      <div className="text-[12px] text-[color:var(--fg-faint)] leading-relaxed">
        {card.meanings.join(", ")}
      </div>
    </div>
  );
}
