"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuizCard } from "@/components/QuizCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import {
  SENTENCE_IDS,
  generateSentenceChoices,
  getSentence,
} from "@/lib/data";
import { cardKey, getTodayQueue, newLearningState } from "@/lib/srs";
import type { SentenceCard } from "@/lib/types";

export default function SentenceQuizPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const review = useStore((s) => s.review);
  const learningStates = useStore((s) => s.learningStates);
  const settings = useStore((s) => s.settings);

  const [seed, setSeed] = useState(() => Date.now());

  const queue = useMemo(() => {
    const now = Date.now();
    const states = SENTENCE_IDS.map(
      (id) => learningStates[cardKey("sentence", id)] ?? newLearningState("sentence", id, now)
    );
    return getTodayQueue(states, now, settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, learningStates, settings]);

  const nextCard: SentenceCard | undefined = useMemo(() => {
    const pool = [...queue.due, ...queue.new];
    if (pool.length === 0) return undefined;
    return getSentence(pool[0].cardId);
  }, [queue]);

  const choices = useMemo(() => {
    if (!nextCard) return null;
    return generateSentenceChoices(nextCard, seed);
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
                className="text-[28px] leading-[1.9] font-medium mb-4"
                style={{
                  fontFamily: "var(--font-jp-serif)",
                  color: "var(--fg)",
                  letterSpacing: "-0.01em",
                }}
              >
                {nextCard.sentenceRuby ? (
                  <RubyText text={nextCard.sentenceRuby} />
                ) : (
                  nextCard.sentence
                )}
              </div>
              <div className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
                {nextCard.translation}
              </div>
            </div>
          }
          subtitle="빈칸에 들어갈 말은?"
          choiceFontFamily="var(--font-jp-sans)"
          choices={choices.choices}
          correct={choices.correct}
          back={<SentenceBack card={nextCard} />}
          onResolved={(wasCorrect) => {
            review("sentence", nextCard.id, wasCorrect);
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
        文章
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
        오늘 문장 카드가 없습니다. 내일 다시 오세요.
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

function SentenceBack({ card }: { card: SentenceCard }) {
  const BLANK_PLACEHOLDER = "＿＿＿";
  const hasRuby = Boolean(card.sentenceRuby);
  const sentenceSrc = card.sentenceRuby ?? card.sentence;
  const answerSrc = card.blankRuby ?? card.blank;

  // Split at the placeholder so we can style the answer segment
  const [before, after] = sentenceSrc.split(BLANK_PLACEHOLDER);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="text-[22px] leading-[1.9] font-medium"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.01em",
        }}
      >
        {hasRuby ? <RubyText text={before ?? ""} /> : before}
        <span className="text-[color:var(--accent-progress)] font-semibold underline decoration-dotted underline-offset-4">
          {hasRuby ? <RubyText text={answerSrc} /> : answerSrc}
        </span>
        {after !== undefined && (hasRuby ? <RubyText text={after} /> : after)}
      </div>
      <div className="text-[14px] text-[color:var(--fg-soft)] leading-relaxed">
        {card.translation}
      </div>
    </div>
  );
}
