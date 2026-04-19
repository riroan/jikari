"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnswerFeedback } from "./AnswerFeedback";
import { RubyText } from "./Furigana";
import { TypingInput } from "./TypingInput";
import {
  matchesAnyAnswer,
  normalizeJapanese,
  normalizeKorean,
} from "@/lib/normalize";

/**
 * Common quiz card for all 3 modes.
 *
 * Flow (identical across input modes):
 *   t=0      user answers → selected/disabled set, feedback shown
 *   t=500    crossfade to back (200ms fade)
 *   t=2000   crossfade back to front with NEW card content
 *   t=2200   unlock
 *
 * Two input modes via discriminated union:
 *   - 'choice': 4-way multiple choice (recognition).
 *   - 'typed':  free text input (active recall). Answer compared against
 *               `acceptableAnswers` after running the language-appropriate
 *               normalizer.
 */

export type QuizCardInput =
  | {
      mode: "choice";
      choices: string[];
      correct: string;
      choiceFontFamily?: string;
    }
  | {
      mode: "typed";
      acceptableAnswers: string[];
      /** Determines IME hint + which normalizer runs for comparison. */
      lang: "ja" | "ko";
      placeholder?: string;
    };

export interface QuizCardProps {
  question: React.ReactNode;
  /** Optional secondary info shown below question — label like "音読み" */
  subtitle?: React.ReactNode;
  input: QuizCardInput;
  /** Optional back-face content shown after answering */
  back?: React.ReactNode;
  /** Called after feedback, caller advances to next card */
  onResolved: (wasCorrect: boolean) => void;
  /** Min height (px) reserved for the question block. Default 260. */
  minQuestionHeight?: number;
}

const DISABLE_MS = 500;
const ANSWER_HOLD_MS = 1500;
const FADE_MS = 200;

export function QuizCard({
  question,
  subtitle,
  input,
  back,
  onResolved,
  minQuestionHeight = 260,
}: QuizCardProps) {
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [showingBack, setShowingBack] = useState(false);
  // Track what the user did this turn (for feedback display + visual highlight).
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [typedUserAnswer, setTypedUserAnswer] = useState<string | null>(null);

  const resolve = useCallback(
    (wasCorrect: boolean) => {
      setResult(wasCorrect ? "correct" : "wrong");
      setDisabled(true);
      if (back) {
        setTimeout(() => setShowingBack(true), DISABLE_MS);
        setTimeout(() => {
          onResolved(wasCorrect);
          setResult(null);
          setDisabled(false);
          setShowingBack(false);
          setSelectedChoice(null);
          setTypedUserAnswer(null);
        }, DISABLE_MS + ANSWER_HOLD_MS);
      } else {
        setTimeout(() => {
          onResolved(wasCorrect);
          setResult(null);
          setDisabled(false);
          setSelectedChoice(null);
          setTypedUserAnswer(null);
        }, ANSWER_HOLD_MS);
      }
    },
    [back, onResolved],
  );

  const handleChoice = useCallback(
    (choice: string) => {
      if (disabled || input.mode !== "choice") return;
      setSelectedChoice(choice);
      resolve(choice === input.correct);
    },
    [disabled, input, resolve],
  );

  const handleTypedSubmit = useCallback(
    (value: string) => {
      if (disabled || input.mode !== "typed") return;
      const normalize =
        input.lang === "ja" ? normalizeJapanese : normalizeKorean;
      const isCorrect = matchesAnyAnswer(
        value,
        input.acceptableAnswers,
        normalize,
      );
      setTypedUserAnswer(value);
      resolve(isCorrect);
    },
    [disabled, input, resolve],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setResult(null);
      setDisabled(false);
      setShowingBack(false);
      setSelectedChoice(null);
      setTypedUserAnswer(null);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="relative" style={{ minHeight: minQuestionHeight }}>
        <AnimatePresence mode="wait" initial={false}>
          {showingBack && back ? (
            <motion.div
              key="back"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
            >
              {back}
            </motion.div>
          ) : (
            <motion.div
              key="front"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
            >
              <div>{question}</div>
              {subtitle && (
                <div className="mt-3 text-xs text-[color:var(--fg-faint)] tracking-[0.18em] font-medium">
                  {subtitle}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {input.mode === "choice" ? (
        <ChoicePanel
          input={input}
          disabled={disabled}
          selected={selectedChoice}
          onChoice={handleChoice}
        />
      ) : (
        <TypedPanel
          input={input}
          disabled={disabled}
          onSubmit={handleTypedSubmit}
          userAnswer={typedUserAnswer}
          result={result}
        />
      )}

      <div className="min-h-[28px]">
        <AnimatePresence>
          {disabled && result !== null && (
            <motion.div
              key={result}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnswerFeedback correct={result === "correct"} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ChoicePanel({
  input,
  disabled,
  selected,
  onChoice,
}: {
  input: Extract<QuizCardInput, { mode: "choice" }>;
  disabled: boolean;
  selected: string | null;
  onChoice: (choice: string) => void;
}) {
  const { choices, correct, choiceFontFamily = "var(--font-jp-sans)" } = input;

  return (
    <div className="flex flex-col gap-2" style={{ fontFamily: choiceFontFamily }}>
      {choices.map((choice) => {
        const isSelected = selected === choice;
        const isCorrectChoice = choice === correct;
        let stateClass =
          "border-[color:var(--line)] hover:bg-[color:var(--bg-deep)]";
        if (disabled && isSelected && isCorrectChoice) {
          stateClass =
            "border-[color:var(--accent-progress)] bg-[color:var(--accent-progress)]/10";
        } else if (disabled && isSelected && !isCorrectChoice) {
          stateClass =
            "border-[color:var(--accent-korean)] bg-[color:var(--accent-korean)]/10";
        } else if (disabled && !isSelected && isCorrectChoice) {
          stateClass =
            "border-[color:var(--accent-progress)] bg-[color:var(--accent-progress)]/5";
        }
        return (
          <button
            key={choice}
            onClick={() => onChoice(choice)}
            disabled={disabled}
            className={`text-left px-4 py-3.5 text-[17px] text-[color:var(--fg)] border rounded-sm transition-colors ${stateClass} disabled:cursor-not-allowed`}
          >
            <RubyText text={choice} />
          </button>
        );
      })}
    </div>
  );
}

function TypedPanel({
  input,
  disabled,
  onSubmit,
  userAnswer,
  result,
}: {
  input: Extract<QuizCardInput, { mode: "typed" }>;
  disabled: boolean;
  onSubmit: (value: string) => void;
  userAnswer: string | null;
  result: "correct" | "wrong" | null;
}) {
  const ariaLabel = input.lang === "ja" ? "読み入력" : "뜻 입력";
  return (
    <div className="flex flex-col gap-3">
      <TypingInput
        ariaLabel={ariaLabel}
        placeholder={input.placeholder}
        lang={input.lang}
        disabled={disabled}
        onSubmit={onSubmit}
      />
      {disabled && result === "wrong" && userAnswer !== null && (
        <div className="text-[13px] text-[color:var(--fg-faint)]">
          입력:{" "}
          <span
            className="text-[color:var(--accent-korean)]"
            style={{
              fontFamily:
                input.lang === "ja"
                  ? "var(--font-jp-sans)"
                  : "var(--font-kr-sans)",
            }}
          >
            {userAnswer}
          </span>
        </div>
      )}
    </div>
  );
}
