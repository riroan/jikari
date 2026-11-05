"use client";

import { Suspense, useMemo, useState } from "react";
import { useIsClient } from "@/lib/use-is-client";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { findExamples, getExampleIndex } from "@/lib/examples";
import { useVocabMissExample } from "@/lib/use-miss-example";
import { useStore } from "@/lib/store";
import { WeakEmptyNotice, WeakKey } from "@/components/WeakKey";
import { useWeakIds } from "@/lib/use-weak-ids";
import { SessionSummary } from "@/components/SessionSummary";
import { useQuizRun } from "@/lib/use-quiz-run";
import {
  generateVocabReadingChoices,
  generateVocabChoices,
  getVocab,
  pickVocabDirection,
  type VocabDirection,
} from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds, weightedShuffleIds } from "@/lib/deck";
import { INITIAL_RATING, expectedScore, jlptDifficulty, quantizeRating } from "@/lib/rating";
import { pickMode } from "@/lib/srs";
import { preferredFor, settleConfusion } from "@/lib/confusion";
import type { VocabCard } from "@/lib/types";

type StudyMode = "study" | "quiz";

export default function VocabPage() {
  return (
    <Suspense fallback={<Shell />}>
      <WeakKey>
        <VocabPageInner />
      </WeakKey>
    </Suspense>
  );
}

function VocabPageInner() {
  const mounted = useIsClient();

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const threshold = useStore((s) => s.settings.typingThresholdBox);
  const vocabIds = useCardsStore((s) => s.vocabIds);
  const vocabById = useCardsStore((s) => s.vocabById);
  const rating = useStore((s) => s.ratings.vocab ?? INITIAL_RATING);
  const ratingTier = quantizeRating(rating);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const [weakIds, emptyWeak] = useWeakIds("vocab", vocabIds);
  const deck = useMemo(
    () =>
      weakIds
        ? shuffleIds(weakIds, seed + epoch * 7919)
        : mode === "study"
        ? shuffleIds(vocabIds, seed + epoch * 7919)
        : weightedShuffleIds(
            vocabIds,
            (id) => getBox("vocab", id),
            seed + epoch * 7919,
            {
              difficultyOf: (id) => jlptDifficulty(vocabById.get(id)),
              rating: ratingTier,
            },
          ),
    // ratingTier, not rating: re-sample once the rating has actually moved.
    [weakIds, mode, seed, epoch, vocabIds, getBox, vocabById, ratingTier]
  );

  const run = useQuizRun(deck.length);

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

  // index % length: the deck is re-sampled when the rating tier moves, so it
  // can shrink under a mid-deck index. Wrap instead of falling off the end.
  if (run.summary)
    return (
      <Shell>
        <SessionSummary
          summary={run.summary}
          onRetry={run.retryMissed}
          onNext={run.next}
        />
      </Shell>
    );
  const cardId = run.retryId ?? deck[index % deck.length] ?? vocabIds[0];
  const card: VocabCard | undefined = getVocab(cardId);
  if (!card) {
    return <Shell />;
  }

  return (
    <Shell>
      {emptyWeak && <WeakEmptyNotice />}
      {mode === "study" ? (
        <StudyCard
          body={<VocabStudyBody card={card} />}
          speak={card.reading}
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
          direction={pickVocabDirection(card, getBox("vocab", card.id), epoch)}
          expected={expectedScore(ratingTier, jlptDifficulty(card))}
          onResolved={(wasCorrect, answerMode) => {
            if (!run.retrying) {
              review(
                "vocab",
                card.id,
                wasCorrect,
                answerMode,
                jlptDifficulty(card),
              );
              recordQuizResult("vocab", wasCorrect);
            }
            run.record(card.id, wasCorrect, card.word, card.koreanMeanings[0] ?? "");
            if (!run.retrying) advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <ModePageShell statKey="vocab" dueKey="vocab" title="単語">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <EmptyCardsState
      label="단어 카드가 아직 없어요."
      hint="scripts/add-vocab.ts로 시드 필요"
    />
  );
}

function VocabQuiz({
  card,
  seed,
  answerMode,
  direction,
  expected,
  onResolved,
}: {
  card: VocabCard;
  seed: number;
  answerMode: "choice" | "typed";
  direction: VocabDirection;
  /** 이 카드를 맞힐 기대 확률 — 선지의 닮은 정도를 조절한다. */
  expected: number;
  onResolved: (correct: boolean, mode: "choice" | "typed") => void;
}) {
  const missExample = useVocabMissExample(card);
  // 전에 고른 오답을 선지에 다시 올린다 (카드가 바뀔 때만 읽음).
  const prefer = useMemo(() => preferredFor(`vocab:${card.id}`), [card.id]);
  const input =
    answerMode === "choice"
      ? (() => {
          if (direction === "reading") {
            const r = generateVocabReadingChoices(card, seed, expected);
            return {
              mode: "choice" as const,
              choices: r.choices,
              correct: r.correct,
              choiceFontFamily: "var(--font-jp-sans)",
            };
          }
          const choices = generateVocabChoices(card, direction, seed, expected, prefer);
          return {
            mode: "choice" as const,
            choices: choices.choices,
            correct: choices.correct,
            choiceFontFamily:
              direction === "recall"
                ? "var(--font-jp-sans)"
                : "var(--font-kr-sans)",
          };
        })()
      : direction === "reading"
        ? {
            mode: "typed" as const,
            lang: "ja" as const,
            acceptableAnswers: [card.reading],
          }
      : direction === "recall"
        ? {
            mode: "typed" as const,
            lang: "ja" as const,
            // KR → JP 타이핑: 한자형과 가나형 모두 허용 (동일하면 dedupe).
            acceptableAnswers: Array.from(new Set([card.word, card.reading])),
          }
        : {
            mode: "typed" as const,
            lang: "ko" as const,
            acceptableAnswers: card.koreanMeanings,
          };

  return (
    <QuizCard
      memoKey={`vocab:${card.id}`}
      missExample={missExample}
      speak={card.reading}
      question={
        direction === "reading" ? (
          <VocabReadingQuestion card={card} />
        ) : direction === "recall" ? (
          <VocabRecallQuestion card={card} />
        ) : (
          <VocabRecognitionQuestion card={card} />
        )
      }
      subtitle={
        direction === "reading" ? "읽는 법은?" : direction === "recall" ? "어떤 단어?" : "의미는?"
      }
      input={input}
      onResolved={(correct, wrongPick) => {
        settleConfusion(`vocab:${card.id}`, correct, wrongPick);
        onResolved(correct, answerMode);
      }}
      minQuestionHeight={0}
    />
  );
}

/** 후리가나 설정과 상관없이 읽기를 가린다 — 읽기가 곧 정답이다. */
function VocabReadingQuestion({ card }: { card: VocabCard }) {
  return (
    <div
      lang="ja"
      className="text-[56px] leading-tight font-semibold mb-2"
      style={{
        fontFamily: "var(--font-jp-serif)",
        letterSpacing: "-0.02em",
        color: "var(--fg)",
      }}
    >
      {card.word}
    </div>
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
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  const examples = useMemo(
    () => findExamples(card, getExampleIndex(sentences, expressions)),
    [card, sentences, expressions],
  );
  return (
    <div className="flex flex-col gap-6">
      <VocabBack card={card} />
      {examples.length > 0 && (
        <ul className="border-t border-[color:var(--line)]">
          {examples.map((ex, i) => (
            <li
              key={`${ex.plain}:${i}`}
              className="flex items-center gap-2 py-3 border-b border-[color:var(--line)]"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span
                  lang="ja"
                  className="text-[18px] leading-loose"
                  style={{ fontFamily: "var(--font-jp-sans)", color: "var(--fg)" }}
                >
                  <RubyText text={ex.ruby} />
                </span>
                <span className="text-small text-[color:var(--fg-soft)]">{ex.ko}</span>
              </div>
              <SpeakButton text={ex.plain} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
      <div className="text-em text-[color:var(--fg)] leading-relaxed font-medium mt-1">
        {card.koreanMeanings.join(", ")}
      </div>
    </div>
  );
}
