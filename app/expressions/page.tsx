"use client";

import { Suspense, useMemo, useState } from "react";
import { useIsClient } from "@/lib/use-is-client";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { ExpressionBack, ExpressionQuiz } from "@/components/ExpressionParts";
import { StudyCard } from "@/components/StudyCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { useStore } from "@/lib/store";
import { WeakEmptyNotice, WeakKey } from "@/components/WeakKey";
import { useWeakIds } from "@/lib/use-weak-ids";
import { SessionSummary } from "@/components/SessionSummary";
import { useQuizRun } from "@/lib/use-quiz-run";
import {
  chooseDirection,
  getExpression,
} from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds, weightedShuffleIds } from "@/lib/deck";
import { INITIAL_RATING, expectedScore, quantizeRating, registerDifficulty } from "@/lib/rating";
import type { ExpressionCard } from "@/lib/types";

type StudyMode = "study" | "quiz";

export default function ExpressionsPage() {
  return (
    <Suspense fallback={<Shell />}>
      <WeakKey>
        <ExpressionsPageInner />
      </WeakKey>
    </Suspense>
  );
}

function ExpressionsPageInner() {
  const mounted = useIsClient();

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const expressionIds = useCardsStore((s) => s.expressionIds);
  const expressionById = useCardsStore((s) => s.expressionById);
  const rating = useStore((s) => s.ratings.expression ?? INITIAL_RATING);
  const ratingTier = quantizeRating(rating);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const [weakIds, emptyWeak] = useWeakIds("expression", expressionIds);
  const deck = useMemo(
    () =>
      weakIds
        ? shuffleIds(weakIds, seed + epoch * 7919)
        : mode === "study"
        ? shuffleIds(expressionIds, seed + epoch * 7919)
        : weightedShuffleIds(
            expressionIds,
            (id) => getBox("expression", id),
            seed + epoch * 7919,
            {
              difficultyOf: (id) => registerDifficulty(expressionById.get(id)),
              rating: ratingTier,
            },
          ),
    // ratingTier, not rating: re-sample once the rating has actually moved.
    [weakIds, mode, seed, epoch, expressionIds, getBox, expressionById, ratingTier],
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
  const cardId = run.retryId ?? deck[index % deck.length] ?? expressionIds[0];
  const card: ExpressionCard | undefined = getExpression(cardId);

  if (!mounted) {
    return <Shell />;
  }

  if (!card) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    );
  }

  if (mode === "study") {
    return (
      <Shell>
        <StudyCard
          body={<ExpressionBack card={card} />}
          speak={card.ruby ?? card.expression_jp}
          grade={{ mode: "expression", cardId: card.id, difficulty: registerDifficulty(card) }}
          shadow
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      </Shell>
    );
  }

  const box = getBox("expression", card.id);
  const direction = chooseDirection(box, card.id, epoch);

  return (
    <Shell>
      {emptyWeak && <WeakEmptyNotice />}
      <ExpressionQuiz
        card={card}
        direction={direction}
        seed={seed + index + epoch * 977}
        expected={expectedScore(ratingTier, registerDifficulty(card))}
        onResolved={(wasCorrect) => {
          if (!run.retrying) {
            review(
              "expression",
              card.id,
              wasCorrect,
              "choice",
              registerDifficulty(card),
            );
            recordQuizResult("expression", wasCorrect);
          }
          run.record(card.id, wasCorrect, card.expression_jp, card.translation_ko);
          if (!run.retrying) advance();
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <ModePageShell statKey="expression" dueKey="expression" title="表現" titleVariant="subdued">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <EmptyCardsState
      label="아직 일상표현 카드가 없어요."
      hint="migration 0011 + seed import 필요"
    />
  );
}

