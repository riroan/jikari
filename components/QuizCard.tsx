"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnswerFeedback } from "./AnswerFeedback";

/**
 * Common quiz card for all 3 modes.
 *
 * Timing (prevents answer-flash when a new card loads):
 *   t=0      user clicks → selected/disabled set
 *   t=500    flip to back (answer revealed)
 *   t=2000   flip to front (same card — user can glance back at question)
 *   t=2700   onResolved + state reset → parent loads next card AFTER flip completes
 *
 * Back face is only mounted when selected !== null. Before user answers,
 * the back DOM is absent — no way for its content to flash even during reflow.
 * Also aria-hidden={!flipped} so screen readers don't leak the answer.
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
const ANSWER_HOLD_MS = 1500; // how long the back face stays visible
const FLIP_MS = 600; // matches motion.div transition duration

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
        // Flip to back (show answer)
        setTimeout(() => setFlipped(true), DISABLE_MS);
        // Flip back to front (still same card — lets the flip animation resolve
        // before the new card's back content ever enters the DOM)
        setTimeout(
          () => setFlipped(false),
          DISABLE_MS + ANSWER_HOLD_MS
        );
        // Finally load the next card — only after the flip-back animation settled
        setTimeout(() => {
          onResolved(wasCorrect);
          setSelected(null);
          setDisabled(false);
        }, DISABLE_MS + ANSWER_HOLD_MS + FLIP_MS);
      } else {
        setTimeout(() => {
          onResolved(wasCorrect);
          setSelected(null);
          setDisabled(false);
        }, ANSWER_HOLD_MS);
      }
    },
    [disabled, correct, back, onResolved]
  );

  // Safety: if parent hot-reloads or props change mid-animation, reset.
  useEffect(() => {
    return () => {
      setSelected(null);
      setDisabled(false);
      setFlipped(false);
    };
  }, []);

  // Back only mounts after user has answered.
  // Even during flip-back or state reset, back DOM is unmounted — no flash possible.
  const showBack = back && selected !== null;

  return (
    <div className="flex flex-col gap-8">
      <div className="min-h-[260px]" style={{ perspective: "1200px" }}>
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: FLIP_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
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
            aria-hidden={flipped}
          >
            <div>{question}</div>
            {subtitle && (
              <div className="mt-3 text-xs text-[color:var(--fg-faint)] tracking-[0.18em] font-medium">
                {subtitle}
              </div>
            )}
          </div>
          {/* Back — mounts ONLY after user answers; stays mounted through reset */}
          {showBack && (
            <div
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                position: "absolute",
                inset: 0,
              }}
              aria-hidden={!flipped}
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
