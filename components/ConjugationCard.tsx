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
} from "@/lib/conjugation";
import { normalizeJapanese, matchesAnyAnswer } from "@/lib/normalize";
import type { ConjugationForm, VerbGroup, VocabCard } from "@/lib/types";

/**
 * Conjugation quiz card.
 *
 * Flow:
 *   Idle     → typing target form label + hero verb + input (IME-safe)
 *   Submit   → lock for 0.3s, compute correctness
 *   Correct  → sage ✓ inline, auto-advance after 1s
 *   Wrong    → clay ✕ + shake, fade in feedback block (correct answer + group + form),
 *              wait for user 次へ click
 *
 * Feedback block visual (DESIGN.md):
 *   - No card / shadow / border-radius. Thin line separator only.
 *   - Inline group tag "─ 一段動詞 ─" (NOT a pill/colored badge).
 *   - Rule text uses Noto Sans JP for JP, Pretendard for KR.
 */

const DISABLE_MS = 300;
const CORRECT_HOLD_MS = 1000;

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

      if (isCorrect) {
        // Auto-advance on correct.
        setTimeout(() => {
          onResolved(true);
          setResult(null);
          setDisabled(false);
          setUserAnswer(null);
        }, CORRECT_HOLD_MS);
      }
      // On wrong: stay until user clicks 次へ.
    },
    [disabled, acceptableAnswers, onResolved],
  );

  const handleNext = useCallback(() => {
    onResolved(false);
    setResult(null);
    setDisabled(false);
    setUserAnswer(null);
  }, [onResolved]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setResult(null);
      setDisabled(false);
      setUserAnswer(null);
    };
  }, []);

  const groupLabelJp = GROUP_LABELS_JP[verb.verbGroup];
  const formLabelKo = FORM_LABELS_KO[form];
  const formLabelJp = FORM_LABELS_JP[form];
  const primaryAnswer = acceptableAnswers[0] ?? "";

  return (
    <div className="flex flex-col gap-8">
      {/* Target form label — "活用 · 명령형으로" */}
      <div
        className="text-[12px] text-[color:var(--fg-faint)] tracking-[0.25em] font-medium"
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
        <div
          className="mt-3 text-[13px] text-[color:var(--fg-faint)]"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {groupLabelJp}
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
                className="text-[14px] text-[color:var(--fg-faint)]"
                style={{ fontFamily: "var(--font-jp-sans)" }}
              >
                {acceptableAnswers.slice(1).join(" · ")}
              </div>
            )}
            <div
              className="text-[13px] text-[color:var(--fg-soft)] tracking-wide"
              style={{ fontFamily: "var(--font-jp-sans)" }}
            >
              ─ {groupLabelJp} · {formLabelJp} ─
            </div>
            <button
              onClick={handleNext}
              className="self-end mt-2 px-4 py-2 text-[13px] tracking-[0.15em] text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
              style={{ minHeight: 44 }}
            >
              次へ
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Correct inline flash (no back-face card flip) */}
      <AnimatePresence>
        {result === "correct" && (
          <motion.div
            key="correct"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-2 text-[color:var(--accent-progress)] font-medium"
            aria-live="polite"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
