"use client";

import { QuizCard } from "@/components/QuizCard";
import { RubyText } from "@/components/Furigana";
import { generateExpressionChoices, type QuizDirection } from "@/lib/data";
import type { ExpressionCard, Register } from "@/lib/types";

// Shared by /expressions and chapter members (mode "expression").
const REGISTER_MEANING: Record<Register, string> = {
  casual: "반말",
  polite: "정중",
  humble: "겸양",
};

const REGISTER_COLOR: Record<Register, string> = {
  casual: "var(--fg-soft)",
  polite: "var(--accent-korean)",
  humble: "var(--accent-progress-text)",
};

// ──────────────────────────────────────────────────────────────
// Quiz front — direction-dependent
// ──────────────────────────────────────────────────────────────

export function ExpressionQuiz({
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
      speak={card.ruby ?? card.expression_jp}
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
      <div className="text-tiny text-[color:var(--fg-faint)] tracking-[0.18em] font-medium uppercase">
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

export function ExpressionBack({ card }: { card: ExpressionCard }) {
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
        <span className="text-tiny text-[color:var(--fg-faint)] tracking-[0.18em] uppercase font-medium">
          SITUATION
        </span>
        <span className="text-caption text-[color:var(--fg-soft)] leading-relaxed">
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
        // 60% border (was 40%): 10px badge + 4.5:1 AA target was borderline
        // in light mode against paper. Higher mix is safer in both palettes.
        borderColor: `color-mix(in srgb, ${color} 60%, transparent)`,
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
