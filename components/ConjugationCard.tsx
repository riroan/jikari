"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TypingInput } from "./TypingInput";
import { RubyText } from "./Furigana";
import {
  conjugateAll,
  ConjugationError,
  FORM_LABELS_JP,
  FORM_LABELS_KO,
  GROUP_LABELS_JP,
  GROUP_LABELS_KO,
} from "@/lib/conjugation";
import { normalizeJapanese, matchesAnyAnswer } from "@/lib/normalize";
import type { ConjugationForm, VerbGroup, VocabCard } from "@/lib/types";

/**
 * Conjugation quiz card.
 *
 * Flow:
 *   Idle     → typing target form label + hero verb + input (IME-safe)
 *   Submit   → lock, compute correctness
 *   Correct  → sage ✓ inline + 次へ button (Space/Enter to advance)
 *   Wrong    → clay ✕ + shake, fade in feedback block (correct answer + group + form),
 *              wait for user 次へ click (Space/Enter to advance)
 *
 * Feedback block visual (DESIGN.md):
 *   - No card / shadow / border-radius. Thin line separator only.
 *   - Inline group tag "─ 一段動詞 ─" (NOT a pill/colored badge).
 *   - Rule text uses Noto Sans JP for JP, Pretendard for KR.
 */

export interface ConjugationCardProps {
  verb: VocabCard & { verbGroup: Exclude<VerbGroup, "not_verb"> };
  form: ConjugationForm;
  onResolved: (wasCorrect: boolean) => void;
}

export function ConjugationCard({
  verb,
  form,
  onResolved,
}: ConjugationCardProps) {
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [userAnswer, setUserAnswer] = useState<string | null>(null);

  // Compute the canonical answers once per card.
  let acceptableAnswers: string[];
  try {
    acceptableAnswers = conjugateAll(
      verb.word,
      verb.reading,
      verb.verbGroup,
      form,
    );
  } catch (e) {
    // Classification error — fail loudly so we notice in dev.
    if (e instanceof ConjugationError) {
      console.error(
        `[ConjugationCard] ${e.message} — verb ${verb.word} (${verb.verbGroup})`,
      );
    }
    acceptableAnswers = [];
  }

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setResult(null);
      setDisabled(false);
      setUserAnswer(null);
    };
  }, []);

  // Space/Enter to advance once feedback is shown. Deferred attach swallows
  // the same Enter that submitted a typed answer.
  useEffect(() => {
    if (!disabled || result === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      e.preventDefault();
      handleNext();
    };
    const id = window.setTimeout(() => {
      window.addEventListener("keydown", handler);
    }, 250);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", handler);
    };
  }, [disabled, result, handleNext]);

  const groupLabelJp = GROUP_LABELS_JP[verb.verbGroup];
  const groupLabelKo = GROUP_LABELS_KO[verb.verbGroup];
  const formLabelKo = FORM_LABELS_KO[form];
  const formLabelJp = FORM_LABELS_JP[form];
  const primaryAnswer = acceptableAnswers[0] ?? "";

  return (
    <div className="flex flex-col gap-8">
      {/* Target form label — "活用 · 명령형으로" */}
      <div
        className="text-label text-[color:var(--fg-faint)] tracking-caption font-medium"
        style={{ fontFamily: "var(--font-kr-sans)" }}
      >
        活用 · {formLabelKo}으로
      </div>

      {/* Hero verb */}
      <div className="text-center">
        <div
          className="text-[96px] leading-none font-semibold"
          style={{
            fontFamily: "var(--font-jp-serif)",
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          {verb.ruby ? <RubyText text={verb.ruby} /> : verb.word}
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

      {/* Typing input — IME-safe */}
      <TypingInput
        ariaLabel="活用形 입력"
        lang="ja"
        disabled={disabled}
        onSubmit={handleSubmit}
      />

      {/* Feedback block — appears on wrong answer only; correct path auto-advances */}
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
                className="text-small text-[color:var(--fg-faint)]"
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

      {/* Correct inline flash + 次へ button */}
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
