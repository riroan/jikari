"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import { generateVocabChoices, getVocab } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds } from "@/lib/deck";
import { pickMode } from "@/lib/srs";
import type { VocabCard } from "@/lib/types";

type StudyMode = "study" | "quiz";

export default function VocabPage() {
  return (
    <Suspense fallback={<Shell />}>
      <VocabPageInner />
    </Suspense>
  );
}

function VocabPageInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const getBox = useStore((s) => s.getBox);
  const threshold = useStore((s) => s.settings.typingThresholdBox);
  const vocabIds = useCardsStore((s) => s.vocabIds);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () => shuffleIds(vocabIds, seed + epoch * 7919),
    [seed, epoch, vocabIds]
  );

  const advance = () => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= deck.length) {
        setEpoch((e) => e + 1);
        return 0;
      }
      return next;
    });
  };

  const retreat = () => {
    setIndex((i) => {
      if (i === 0) {
        setEpoch((e) => Math.max(0, e - 1));
        return deck.length - 1;
      }
      return i - 1;
    });
  };

  const cardId = deck[index] ?? vocabIds[0];
  const card: VocabCard | undefined = getVocab(cardId);

  if (!mounted || !card) {
    return <Shell />;
  }

  return (
    <Shell>
      {mode === "study" ? (
        <StudyCard
          body={<VocabStudyBody card={card} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <VocabQuiz
          card={card}
          seed={seed + index + epoch * 977}
          answerMode={pickMode(getBox("vocab", card.id), threshold)}
          onResolved={(wasCorrect, answerMode) => {
            review("vocab", card.id, wasCorrect, answerMode);
            advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header className="flex justify-between items-baseline mb-8">
          <Link
            href="/"
            className="text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          <h1
            className="text-[15px] tracking-[0.15em] text-[color:var(--fg-soft)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            単語
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function VocabQuiz({
  card,
  seed,
  answerMode,
  onResolved,
}: {
  card: VocabCard;
  seed: number;
  answerMode: "choice" | "typed";
  onResolved: (correct: boolean, mode: "choice" | "typed") => void;
}) {
  const input =
    answerMode === "choice"
      ? (() => {
          const choices = generateVocabChoices(card, seed);
          return {
            mode: "choice" as const,
            choices: choices.choices,
            correct: choices.correct,
            choiceFontFamily: "var(--font-kr-sans)",
          };
        })()
      : {
          mode: "typed" as const,
          lang: "ko" as const,
          acceptableAnswers: card.koreanMeanings,
        };

  return (
    <QuizCard
      question={
        <div>
          <div
            className="text-[56px] leading-tight font-semibold mb-2"
            style={{
              fontFamily: "var(--font-jp-serif)",
              letterSpacing: "-0.02em",
              color: "var(--fg)",
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
        </div>
      }
      subtitle="의미는?"
      input={input}
      back={<VocabBack card={card} />}
      onResolved={(correct) => onResolved(correct, answerMode)}
      minQuestionHeight={0}
    />
  );
}

function VocabStudyBody({ card }: { card: VocabCard }) {
  return <VocabBack card={card} />;
}

function VocabBack({ card }: { card: VocabCard }) {
  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}
