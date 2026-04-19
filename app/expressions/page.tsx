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
  generateExpressionChoices,
  getExpression,
  type QuizDirection,
} from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { weightedShuffleIds } from "@/lib/deck";
import type { ExpressionCard, Register } from "@/lib/types";

type StudyMode = "study" | "quiz";

const REGISTER_MEANING: Record<Register, string> = {
  casual: "반말",
  polite: "정중",
  humble: "겸양",
};

const REGISTER_COLOR: Record<Register, string> = {
  casual: "var(--fg-soft)",
  polite: "var(--accent-korean)",
  humble: "var(--accent-progress)",
};

export default function ExpressionsPage() {
  return (
    <Suspense fallback={<Shell />}>
      <ExpressionsPageInner />
    </Suspense>
  );
}

function ExpressionsPageInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const expressionIds = useCardsStore((s) => s.expressionIds);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () =>
      mode === "study"
        ? expressionIds
        : weightedShuffleIds(
            expressionIds,
            (id) => getBox("expression", id),
            seed + epoch * 7919,
          ),
    [mode, seed, epoch, expressionIds, getBox],
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

  const cardId = deck[index] ?? expressionIds[0];
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
      <ExpressionQuiz
        card={card}
        direction={direction}
        seed={seed + index + epoch * 977}
        onResolved={(wasCorrect) => {
          review("expression", card.id, wasCorrect);
          recordQuizResult("expression", wasCorrect);
          advance();
        }}
      />
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <ModePageShell statKey="expression" title="表現" titleVariant="subdued">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <div className="pt-16 text-center text-[color:var(--fg-faint)] text-[13px] leading-relaxed">
      아직 일상표현 카드가 없어요.
      <br />
      <span className="text-[11px] tracking-wider">
        (migration 0011 + seed import 필요)
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Quiz front — direction-dependent
// ──────────────────────────────────────────────────────────────

function ExpressionQuiz({
  card,
  direction,
  seed,
  onResolved,
}: {
  card: ExpressionCard;
  direction: QuizDirection;
  seed: number;
  onResolved: (correct: boolean) => void;
}) {
  const choices = generateExpressionChoices(card, direction, seed);

  return (
    <QuizCard
      question={
        direction === "recall" ? (
          <RecallQuestion card={card} />
        ) : (
          <RecognitionQuestion card={card} />
        )
      }
      subtitle={direction === "recall" ? "어떤 표현?" : "어떤 뜻?"}
      input={{
        mode: "choice",
        choices: choices.choices,
        correct: choices.correct,
        // Recognition choices are Korean meanings → Pretendard (default, not jp-sans).
        choiceFontFamily:
          direction === "recall" ? "var(--font-jp-sans)" : "inherit",
      }}
      back={<ExpressionBack card={card} />}
      onResolved={onResolved}
      minQuestionHeight={0}
    />
  );
}

function RecallQuestion({ card }: { card: ExpressionCard }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] font-medium uppercase">
        SITUATION
      </div>
      <div
        className="text-body font-medium text-[color:var(--fg)] leading-snug"
        style={{ fontFamily: "var(--font-jp-sans), inherit" }}
      >
        {/* Korean situation prompt — use Pretendard default, not jp-sans. */}
        <span style={{ fontFamily: "inherit" }}>{card.situation_ko}</span>
      </div>
    </div>
  );
}

function RecognitionQuestion({ card }: { card: ExpressionCard }) {
  const src = card.ruby ?? card.expression_jp;
  return (
    <div
      className="text-h2 leading-[1.6] font-medium"
      style={{
        fontFamily: "var(--font-jp-serif)",
        color: "var(--fg)",
        letterSpacing: "-0.01em",
      }}
    >
      <RubyText text={src} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Back / Study body — shared hierarchy:
//   표현(32px serif)+register ≫ 뜻(17px body) ≫ 상황(11px label + 13px faint) ≫ note(12px caption)
// ──────────────────────────────────────────────────────────────

function ExpressionBack({ card }: { card: ExpressionCard }) {
  const src = card.ruby ?? card.expression_jp;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className="text-h2 leading-[1.6] font-medium"
          style={{
            fontFamily: "var(--font-jp-serif)",
            color: "var(--fg)",
            letterSpacing: "-0.01em",
          }}
        >
          <RubyText text={src} />
        </div>
        <RegisterPill register={card.register} />
      </div>

      <div
        className="text-body font-medium text-[color:var(--fg)] leading-snug"
      >
        {card.translation_ko}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] uppercase font-medium">
          SITUATION
        </span>
        <span className="text-[13px] text-[color:var(--fg-soft)] leading-relaxed">
          {card.situation_ko}
        </span>
      </div>

      {card.note_ko && (
        <p className="text-[12px] text-[color:var(--fg-faint)] leading-relaxed border-t border-[color:var(--line)] pt-3">
          {card.note_ko}
        </p>
      )}
    </div>
  );
}

function RegisterPill({ register }: { register: Register }) {
  const color = REGISTER_COLOR[register];
  return (
    <span
      className="shrink-0 inline-flex items-center gap-1 text-[10px] tracking-wider font-medium uppercase px-1.5 py-0.5 rounded-sm border"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
      }}
    >
      <span>{register}</span>
      <span
        aria-hidden="true"
        className="text-[color:var(--fg-faint)] normal-case tracking-normal"
      >
        ·
      </span>
      <span
        className="text-[color:var(--fg-soft)] normal-case tracking-normal"
      >
        {REGISTER_MEANING[register]}
      </span>
    </span>
  );
}
