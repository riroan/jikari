"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnswerFeedback } from "./AnswerFeedback";

/**
 * Common quiz card for all 3 modes.
 * - Shows question + 4 choices.
 * - On click: disable inputs for 0.5s (prevent double-tap), show feedback.
 * - Render-prop pattern for question content: caller provides front/back.
 */

export interface QuizCardProps {
  question: React.ReactNode;
  /** Optional secondary info shown below question — label like "音読み" */
  subtitle?: React.ReactNode;
  choices: string[];
  correct: string;
  /** Optional back-face content shown after answering */
  back?: React.ReactNode;
  /** Called after feedback, caller advances to next card */
  onResolved: (wasCorrect: boolean) => void;
  choiceFontFamily?: string;
}

const DISABLE_MS = 500;
const FEEDBACK_MS = 1500;

export function QuizCard({
  question,
  subtitle,
  choices,
  correct,
  back,
  onResolved,
  choiceFontFamily = "var(--font-jp-sans)",
}: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const handleChoice = useCallback(
    (choice: string) => {
      if (disabled) return;
      setSelected(choice);
      setDisabled(true);
      const wasCorrect = choice === correct;

      if (back) {
        setTimeout(() => setFlipped(true), DISABLE_MS);
      }
      setTimeout(() => {
        onResolved(wasCorrect);
        // Reset for next card
        setSelected(null);
        setDisabled(false);
        setFlipped(false);
      }, FEEDBACK_MS + (back ? 400 : 0));
    },
    [disabled, correct, back, onResolved]
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="min-h-[260px]" style={{ perspective: "1200px" }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d", position: "relative" }}
          className="min-h-[260px]"
        >
          {/* Front */}
          <div
            style={{
              backfaceVisibility: "hidden",
              position: flipped ? "absolute" : "relative",
              inset: 0,
            }}
          >
            <div>{question}</div>
            {subtitle && (
              <div className="mt-3 text-xs text-[color:var(--fg-faint)] tracking-[0.18em] font-medium">
                {subtitle}
              </div>
            )}
          </div>
          {/* Back */}
          {back && (
            <div
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                position: "absolute",
                inset: 0,
              }}
            >
              {back}
            </div>
          )}
        </motion.div>
      </div>

      <div className="flex flex-col gap-2" style={{ fontFamily: choiceFontFamily }}>
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === correct;
          let stateClass = "border-[color:var(--line)] hover:bg-[color:var(--bg-deep)]";
          if (disabled && isSelected && isCorrectChoice) {
            stateClass = "border-[color:var(--accent-progress)] bg-[color:var(--accent-progress)]/10";
          } else if (disabled && isSelected && !isCorrectChoice) {
            stateClass = "border-[color:var(--accent-korean)] bg-[color:var(--accent-korean)]/10";
          } else if (disabled && !isSelected && isCorrectChoice) {
            // Show the correct answer after wrong pick
            stateClass = "border-[color:var(--accent-progress)] bg-[color:var(--accent-progress)]/5";
          }
          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={disabled}
              className={`text-left px-4 py-3.5 text-[17px] text-[color:var(--fg)] border rounded-sm transition-colors ${stateClass} disabled:cursor-not-allowed`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      <div className="min-h-[28px]">
        <AnimatePresence>
          {disabled && selected !== null && (
            <motion.div
              key={selected}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AnswerFeedback correct={selected === correct} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
