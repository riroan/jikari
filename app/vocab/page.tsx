"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import {
  chooseDirection,
  generateVocabChoices,
  getVocab,
  type QuizDirection,
} from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { weightedShuffleIds } from "@/lib/deck";
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
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const threshold = useStore((s) => s.settings.typingThresholdBox);
  const vocabIds = useCardsStore((s) => s.vocabIds);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () =>
      mode === "study"
        ? vocabIds
        : weightedShuffleIds(
            vocabIds,
            (id) => getBox("vocab", id),
            seed + epoch * 7919,
          ),
    [mode, seed, epoch, vocabIds, getBox]
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

  if (!mounted) {
    return <Shell />;
  }

  if (vocabIds.length === 0) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    );
  }

  const cardId = deck[index] ?? vocabIds[0];
  const card: VocabCard | undefined = getVocab(cardId);
  if (!card) {
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
          direction={chooseDirection(getBox("vocab", card.id), card.id, epoch)}
          onResolved={(wasCorrect, answerMode) => {
            review("vocab", card.id, wasCorrect, answerMode);
            recordQuizResult("vocab", wasCorrect);
            advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <ModePageShell statKey="vocab" title="単語">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <div className="pt-16 text-center text-[color:var(--fg-faint)] text-[13px] leading-relaxed">
      단어 카드가 아직 없어요.
      <br />
      <span className="text-[11px] tracking-wider">
        (scripts/add-vocab.ts로 시드 필요)
      </span>
    </div>
  );
}

function VocabQuiz({
  card,
  seed,
  answerMode,
  direction,
  onResolved,
}: {
  card: VocabCard;
  seed: number;
  answerMode: "choice" | "typed";
  direction: QuizDirection;
  onResolved: (correct: boolean, mode: "choice" | "typed") => void;
}) {
  // Typed 모드는 한국어 답만 받으므로 항상 recognition 방향.
  const effectiveDirection: QuizDirection =
    answerMode === "typed" ? "recognition" : direction;

  const input =
    answerMode === "choice"
      ? (() => {
          const choices = generateVocabChoices(card, effectiveDirection, seed);
          return {
            mode: "choice" as const,
            choices: choices.choices,
            correct: choices.correct,
            choiceFontFamily:
              effectiveDirection === "recall"
                ? "var(--font-jp-sans)"
                : "var(--font-kr-sans)",
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
        effectiveDirection === "recall" ? (
          <VocabRecallQuestion card={card} />
        ) : (
          <VocabRecognitionQuestion card={card} />
        )
      }
      subtitle={effectiveDirection === "recall" ? "어떤 단어?" : "의미는?"}
      input={input}
      onResolved={(correct) => onResolved(correct, answerMode)}
      minQuestionHeight={0}
    />
  );
}

function VocabRecognitionQuestion({ card }: { card: VocabCard }) {
  return (
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
  );
}

function VocabRecallQuestion({ card }: { card: VocabCard }) {
  return (
    <div
      className="text-[32px] leading-snug font-medium text-[color:var(--fg)]"
      style={{ letterSpacing: "-0.01em" }}
    >
      {card.koreanMeanings.join(", ")}
    </div>
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
