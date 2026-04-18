"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnswerFeedback } from "./AnswerFeedback";
import { RubyText } from "./Furigana";

/**
 * Common quiz card for all 3 modes.
 *
 * Flow:
 *   t=0      user clicks → selected/disabled set, button highlights + feedback
 *   t=500    crossfade to back (200ms fade)
 *   t=2000   crossfade back to front — but with NEW card content (same instant)
 *   t=2200   unlock for next click
 *
 * No 3D flip. Just a subtle opacity crossfade via AnimatePresence mode="wait".
 * Back DOM only mounts after the user answers (prevents any chance of answer
 * leak during layout reflows on new card load).
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
  /** Min height (px) reserved for the question block. Default 260. */
  minQuestionHeight?: number;
}

const DISABLE_MS = 500;
const ANSWER_HOLD_MS = 1500;
const FADE_MS = 200;

export function QuizCard({
  question,
  subtitle,
  choices,
  correct,
  back,
  onResolved,
  choiceFontFamily = "var(--font-jp-sans)",
  minQuestionHeight = 260,
}: QuizCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [showingBack, setShowingBack] = useState(false);

  const handleChoice = useCallback(
    (choice: string) => {
      if (disabled) return;
      setSelected(choice);
      setDisabled(true);
      const wasCorrect = choice === correct;

      if (back) {
        setTimeout(() => setShowingBack(true), DISABLE_MS);
        setTimeout(() => {
          // Load next card AND switch back to front in the same flush.
          // AnimatePresence will crossfade.
          onResolved(wasCorrect);
          setSelected(null);
          setDisabled(false);
          setShowingBack(false);
        }, DISABLE_MS + ANSWER_HOLD_MS);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setSelected(null);
      setDisabled(false);
      setShowingBack(false);
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
              <RubyText text={choice} />
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
