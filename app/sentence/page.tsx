"use client";

import { Suspense, useMemo, useState } from "react";
import { useIsClient } from "@/lib/use-is-client";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import { generateSentenceChoices, getSentence } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds, weightedShuffleIds } from "@/lib/deck";
import { INITIAL_RATING, jlptDifficulty, quantizeRating } from "@/lib/rating";
import type { SentenceCard } from "@/lib/types";

type StudyMode = "study" | "quiz";

const BLANK = "＿＿＿";

export default function SentencePage() {
  return (
    <Suspense fallback={<Shell />}>
      <SentencePageInner />
    </Suspense>
  );
}

function SentencePageInner() {
  const mounted = useIsClient();

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const sentenceIds = useCardsStore((s) => s.sentenceIds);
  const sentenceById = useCardsStore((s) => s.sentenceById);
  const rating = useStore((s) => s.ratings.sentence ?? INITIAL_RATING);
  const ratingTier = quantizeRating(rating);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () =>
      mode === "study"
        ? shuffleIds(sentenceIds, seed + epoch * 7919)
        : weightedShuffleIds(
            sentenceIds,
            (id) => getBox("sentence", id),
            seed + epoch * 7919,
            {
              difficultyOf: (id) => jlptDifficulty(sentenceById.get(id)),
              rating: ratingTier,
            },
          ),
    // ratingTier, not rating: re-sample once the rating has actually moved.
    [mode, seed, epoch, sentenceIds, getBox, sentenceById, ratingTier]
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

  if (sentenceIds.length === 0) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    );
  }

  // index % length: the deck is re-sampled when the rating tier moves, so it
  // can shrink under a mid-deck index. Wrap instead of falling off the end.
  const cardId = deck[index % deck.length] ?? sentenceIds[0];
  const card: SentenceCard | undefined = getSentence(cardId);
  if (!card) {
    return <Shell />;
  }

  return (
    <Shell>
      {mode === "study" ? (
        <StudyCard
          body={<SentenceStudyBody card={card} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <SentenceQuiz
          card={card}
          seed={seed + index + epoch * 977}
          onResolved={(wasCorrect) => {
            review(
              "sentence",
              card.id,
              wasCorrect,
              "choice",
              jlptDifficulty(card),
            );
            recordQuizResult("sentence", wasCorrect);
            advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <ModePageShell statKey="sentence" dueKey="sentence_vocab" title="文章">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <EmptyCardsState
      label="문장 카드가 아직 없어요."
      hint="scripts/add-sentence.ts로 시드 필요"
    />
  );
}

function SentenceQuiz({
  card,
  seed,
  onResolved,
}: {
  card: SentenceCard;
  seed: number;
  onResolved: (correct: boolean) => void;
}) {
  const choices = generateSentenceChoices(card, seed);
  return (
    <QuizCard
      question={
        <div>
          <div
            className="text-h2 leading-[1.8] font-medium mb-3"
            style={{
              fontFamily: "var(--font-jp-serif)",
              color: "var(--fg)",
              letterSpacing: "-0.01em",
            }}
          >
            {card.sentenceRuby ? (
              <RubyText text={card.sentenceRuby} />
            ) : (
              card.sentence
            )}
          </div>
          <div className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
            {card.translation}
          </div>
        </div>
      }
      subtitle="빈칸에 들어갈 말은?"
      input={{
        mode: "choice",
        choices: choices.choices,
        correct: choices.correct,
        choiceFontFamily: "var(--font-jp-sans)",
      }}
      onResolved={onResolved}
      minQuestionHeight={0}
    />
  );
}

function SentenceStudyBody({ card }: { card: SentenceCard }) {
  // Study mode: show the full sentence with the blank already filled in.
  const hasRuby = Boolean(card.sentenceRuby);
  const sentenceSrc = card.sentenceRuby ?? card.sentence;
  const answerSrc = card.blankRuby ?? card.blank;
  const [before, after] = sentenceSrc.split(BLANK);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="text-h2 leading-[1.8] font-medium"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.01em",
        }}
      >
        {hasRuby ? <RubyText text={before ?? ""} /> : before}
        <span className="text-[color:var(--accent-progress)] font-semibold">
          {hasRuby ? <RubyText text={answerSrc} /> : answerSrc}
        </span>
        {after !== undefined && (hasRuby ? <RubyText text={after} /> : after)}
      </div>
      <div className="text-small text-[color:var(--fg-soft)] leading-relaxed">
        {card.translation}
      </div>
    </div>
  );
}

