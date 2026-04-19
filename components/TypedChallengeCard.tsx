"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TypingInput } from "./TypingInput";
import { normalizeJapanese, matchesAnyAnswer } from "@/lib/normalize";

const KEYBOARD_GRACE_MS = 250;

/**
 * Shared typed-challenge UI used by both ConjugationCard (verb 活用) and
 * AdjectiveCard (形容詞 활용). Handles input, correctness, feedback block
 * visuals, and Space/Enter-to-advance keyboard flow. The calling adapter
 * computes `acceptableAnswers` and supplies category/form/group labels.
 */
export interface TypedChallengeCardProps {
  acceptableAnswers: string[];
  categoryLabel: string;
  formLabelKo: string;
  formLabelJp: string;
  hero: React.ReactNode;
  heroFontSizePx: number;
  groupLabelKo: string;
  groupLabelJp: string;
  onResolved: (wasCorrect: boolean) => void;
}

export function TypedChallengeCard({
  acceptableAnswers,
  categoryLabel,
  formLabelKo,
  formLabelJp,
  hero,
  heroFontSizePx,
  groupLabelKo,
  groupLabelJp,
  onResolved,
}: TypedChallengeCardProps) {
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);
  const resolvedAtRef = useRef(0);

  const handleSubmit = useCallback(
    (value: string) => {
      if (disabled) return;
      const isCorrect = matchesAnyAnswer(
        value,
        acceptableAnswers,
        normalizeJapanese,
      );
      setUserAnswer(value);
      setResult(isCorrect ? "correct" : "wrong");
      setDisabled(true);
      resolvedAtRef.current = Date.now();
    },
    [disabled, acceptableAnswers],
  );

  const handleNext = useCallback(() => {
    if (result === null) return;
    onResolved(result === "correct");
    setResult(null);
    setDisabled(false);
    setUserAnswer(null);
  }, [result, onResolved]);

  useEffect(() => {
    return () => {
      setResult(null);
      setDisabled(false);
      setUserAnswer(null);
    };
  }, []);

  // Space/Enter to advance. Inline grace check mirrors QuizCard so we don't
  // rely on event-loop timing to swallow the Enter that submitted a typed
  // answer.
  useEffect(() => {
    if (!disabled || result === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if (Date.now() - resolvedAtRef.current < KEYBOARD_GRACE_MS) return;
      e.preventDefault();
      handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, result, handleNext]);

  const primaryAnswer = acceptableAnswers[0] ?? "";

  return (
    <div className="flex flex-col gap-8">
      <div
        className="text-label text-[color:var(--fg-faint)] tracking-caption font-medium"
        style={{ fontFamily: "var(--font-kr-sans)" }}
      >
        {categoryLabel} · {formLabelKo}으로
      </div>

      <div className="text-center">
        <div
          className="leading-none font-semibold"
          style={{
            fontFamily: "var(--font-jp-serif)",
            fontSize: `${heroFontSizePx}px`,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          {hero}
        </div>
        <div className="mt-3 text-[13px] text-[color:var(--fg-faint)]">
          <span style={{ fontFamily: "var(--font-kr-sans)" }}>
            {groupLabelKo}
          </span>
          <span className="mx-1.5">·</span>
          <span style={{ fontFamily: "var(--font-jp-sans)" }}>
            {groupLabelJp}
          </span>
        </div>
      </div>

      <TypingInput
        ariaLabel="活用形 입력"
        lang="ja"
        disabled={disabled}
        onSubmit={handleSubmit}
      />

      <AnimatePresence>
        {result === "wrong" && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col gap-3 pt-3 border-t border-[color:var(--line)]"
          >
            {userAnswer !== null && (
              <div
                className="text-[13px] text-[color:var(--fg-faint)]"
                style={{ fontFamily: "var(--font-jp-sans)" }}
              >
                입력:{" "}
                <span
                  className="text-[color:var(--accent-korean)]"
                  style={{ fontFamily: "var(--font-jp-sans)" }}
                >
                  {userAnswer}
                </span>
              </div>
            )}
            <div
              className="text-[32px] leading-tight font-semibold"
              style={{
                fontFamily: "var(--font-jp-serif)",
                color: "var(--fg)",
                letterSpacing: "-0.01em",
              }}
            >
              {primaryAnswer}
            </div>
            {acceptableAnswers.length > 1 && (
              <div
                className="text-[13px] text-[color:var(--fg-faint)]"
                style={{ fontFamily: "var(--font-jp-sans)" }}
              >
                {acceptableAnswers.slice(1).join(" · ")}
              </div>
            )}
            <div className="text-[13px] text-[color:var(--fg-soft)] tracking-wide">
              <span style={{ fontFamily: "var(--font-jp-sans)" }}>─ </span>
              <span style={{ fontFamily: "var(--font-kr-sans)" }}>
                {groupLabelKo}
              </span>
              <span className="mx-1">·</span>
              <span style={{ fontFamily: "var(--font-jp-sans)" }}>
                {groupLabelJp} · {formLabelJp} ─
              </span>
            </div>
            <button
              onClick={handleNext}
              className="self-end mt-2 px-4 py-2 text-[13px] tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
              style={{ minHeight: 44 }}
            >
              次へ
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result === "correct" && (
          <motion.div
            key="correct"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between gap-3"
            aria-live="polite"
          >
            <div className="inline-flex items-center gap-2 text-[color:var(--accent-progress)] font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontFamily: "var(--font-jp-sans)" }}>
                {primaryAnswer}
              </span>
            </div>
            <button
              onClick={handleNext}
              className="px-4 py-2 text-[13px] tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
              style={{ minHeight: 44 }}
            >
              次へ
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
