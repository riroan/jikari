"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import { generateSentenceChoices, getSentence } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { weightedShuffleIds } from "@/lib/deck";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const sentenceIds = useCardsStore((s) => s.sentenceIds);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () =>
      mode === "study"
        ? sentenceIds
        : weightedShuffleIds(
            sentenceIds,
            (id) => getBox("sentence", id),
            seed + epoch * 7919,
          ),
    [mode, seed, epoch, sentenceIds, getBox]
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

  const cardId = deck[index] ?? sentenceIds[0];
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
            review("sentence", card.id, wasCorrect);
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
    <ModePageShell statKey="sentence" title="文章">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <div className="pt-16 text-center text-[color:var(--fg-faint)] text-[13px] leading-relaxed">
      문장 카드가 아직 없어요.
      <br />
      <span className="text-[11px] tracking-wider">
        (scripts/add-sentence.ts로 시드 필요)
      </span>
    </div>
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
          <div className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
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

