"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence, MotionConfig } from "framer-motion";
import { AnswerFeedback } from "./AnswerFeedback";
import { RubyText } from "./Furigana";
import { SpeakButton } from "./SpeakButton";
import { TypingInput } from "./TypingInput";
import {
  matchesAnyAnswer,
  normalizeJapanese,
  normalizeKorean,
} from "@/lib/normalize";
import { hintAnswer } from "@/lib/hint";
import { markAnswered, markShown } from "@/lib/srs";
import { useMemos } from "@/lib/use-memos";
import type { Example } from "@/lib/examples";

/**
 * Common quiz card for all 3 modes.
 *
 * Flow (identical across input modes):
 *   t=0      user answers → selected/disabled set, feedback shown, and the
 *            back face swapped in at once if `back` provided (no fade — the
 *            answer should be readable the instant the choice is made)
 *   wait     user clicks 다음 → / presses Space|Enter to advance
 *
 * Keyboard advance has a 250ms grace period so an Enter held from typed
 * submission does not instantly skip the feedback.
 *
 * Two input modes via discriminated union:
 *   - 'choice': 4-way multiple choice (recognition).
 *   - 'typed':  free text input (active recall). Answer compared against
 *               `acceptableAnswers` after running the language-appropriate
 *               normalizer.
 */

type QuizCardInput =
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
  /** Japanese text to pronounce; the speaker button shows only after answering. */
  speak?: string;
  /** cardKey (`mode:cardId`, same as the misses log): shows the learner's memo after answering. */
  memoKey?: string;
  /** Shown only after a WRONG answer, below the next button (never shifts it). Null/undefined renders nothing. */
  missExample?: Example | null;
  /** false where the answer is never scheduled (listening): hides the "느렸어요" note. Default true. */
  scored?: boolean;
  /** Called after feedback, caller advances to next card */
  onResolved: (wasCorrect: boolean) => void;
  /**
   * Min height (px) reserved for the question block. Default 260.
   * On mobile (<md) the value is capped at 180 so choices stay visible without scrolling.
   */
  minQuestionHeight?: number;
}

const KEYBOARD_GRACE_MS = 250;

export function QuizCard({
  question,
  subtitle,
  input,
  back,
  speak,
  memoKey,
  missExample,
  scored = true,
  onResolved,
  minQuestionHeight = 260,
}: QuizCardProps) {
  const memo = useMemos().get(memoKey ?? "");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [showingBack, setShowingBack] = useState(false);
  // Track what the user did this turn (for feedback display + visual highlight).
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [typedUserAnswer, setTypedUserAnswer] = useState<string | null>(null);
  const [hinted, setHinted] = useState(false);
  const [slow, setSlow] = useState(false);
  const resolvedAtRef = useRef(0);

  const advance = useCallback(() => {
    if (result === null) return;
    // Assisted answers never promote the card: report them as a miss.
    onResolved(result === "correct" && !hinted);
    setHinted(false);
    setSlow(false);
    markShown();
    setResult(null);
    setDisabled(false);
    setShowingBack(false);
    setSelectedChoice(null);
    setTypedUserAnswer(null);
  }, [result, hinted, onResolved]);

  const resolve = useCallback(
    (wasCorrect: boolean) => {
      setResult(wasCorrect ? "correct" : "wrong");
      setDisabled(true);
      resolvedAtRef.current = Date.now();
      setSlow(markAnswered(input.mode) && wasCorrect);
      if (back) {
        setShowingBack(true);
      }
    },
    [back, input.mode],
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

  useEffect(() => markShown(), []);

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

  // Space/Enter to advance once feedback is shown. Grace period swallows the
  // same Enter that submitted a typed answer (key-repeat would otherwise skip).
  useEffect(() => {
    if (!disabled || result === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== " " && e.key !== "Enter") return;
      if ((e.target as HTMLElement).closest?.("button,a")) return;
      if (Date.now() - resolvedAtRef.current < KEYBOARD_GRACE_MS) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, result, advance]);

  return (
    <LazyMotion features={domAnimation}>
    <MotionConfig reducedMotion="user">
    <div className="flex flex-col gap-6 md:gap-8">
      <div
        className="relative min-h-[var(--qc-min-mobile)] md:min-h-[var(--qc-min)]"
        style={
          {
            "--qc-min-mobile": `${Math.min(minQuestionHeight, 180)}px`,
            "--qc-min": `${minQuestionHeight}px`,
          } as React.CSSProperties
        }
      >
        {showingBack && back ? (
          back
        ) : (
          <div>
            <div>{question}</div>
            {subtitle && (
              <div className="mt-3 text-xs text-[color:var(--fg-faint)] tracking-label font-medium">
                {subtitle}
              </div>
            )}
          </div>
        )}
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
          hintText={hintAnswer(input.acceptableAnswers, input.lang === "ja" ? speak : undefined)}
          onHintUsed={() => setHinted(true)}
        />
      )}

      <div className="flex items-center justify-between gap-3 min-h-[44px]">
        <div role="status">
          <AnimatePresence>
            {disabled && result !== null && (
              <m.div
                key={result}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnswerFeedback correct={result === "correct"} />
                {hinted && result === "correct" && (
                  <p className="mt-1 text-caption text-[color:var(--fg-faint)]">
                    힌트를 썼어요 — 다시 도전할 카드로 남겨둘게요
                  </p>
                )}
                {scored && slow && !hinted && result === "correct" && (
                  <p className="mt-1 text-caption text-[color:var(--fg-faint)]">
                    느렸어요 · 한 번 더 볼게요
                  </p>
                )}
              </m.div>
            )}
          </AnimatePresence>
        </div>
        {disabled && result !== null && (
          <div className="flex items-center gap-1">
            {speak && <SpeakButton text={speak} />}
          <button
            type="button"
            onClick={advance}
            // 가로 모드(높이 ~400px)에선 정답 면이 길어 이 버튼이 화면 밖으로
            // 밀린다. 보이는 상태면 "nearest"는 아무것도 하지 않는다.
            // scroll-mb: 화면 바닥(홈 인디케이터)에 붙지 않고 한 줄 위에 멈춘다.
            ref={(el) => el?.scrollIntoView?.({ block: "nearest" })}
            className="scroll-mb-[calc(var(--safe-bottom)+1rem)] px-4 py-2 text-caption tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
            style={{ minHeight: 44 }}
            aria-label="다음 문제"
          >
            다음 →
          </button>
          </div>
        )}
      </div>

      {disabled && result !== null && ((result === "wrong" && missExample) || memo) && (
        // Below the button row, so it can never push the 다음 button. -mt-3: tucked closer than the card gap.
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="-mt-3 flex flex-col gap-2"
          data-testid="quiz-tail"
        >
          {result === "wrong" && missExample && (
            <div className="flex items-center gap-2 pt-3 border-t border-[color:var(--line)]">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span
                  lang="ja"
                  className="text-[16px] leading-loose"
                  style={{ fontFamily: "var(--font-jp-sans)", color: "var(--fg)" }}
                >
                  <RubyText text={missExample.ruby} />
                </span>
                <span className="text-small text-[color:var(--fg-soft)]">{missExample.ko}</span>
              </div>
              <SpeakButton text={missExample.plain} />
            </div>
          )}
          {memo && (
            <p lang="ko" className="text-caption text-[color:var(--fg-faint)] break-words">
              {memo}
            </p>
          )}
        </m.div>
      )}
    </div>
    </MotionConfig>
    </LazyMotion>
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
            className={`text-left px-4 py-3.5 text-body text-[color:var(--fg)] border rounded-sm transition-colors ${stateClass} disabled:cursor-not-allowed`}
          >
            <RubyText text={choice} />
          </button>
        );
      })}
    </div>
  );
}

// Hint trigger: user answered wrong in Japanese-expected mode but typed zero
// Japanese characters (no hiragana/katakana/kanji) and at least one Hangul —
// classic Korean-IME-active-by-mistake symptom.
const HANGUL_RE = /[가-힯ᄀ-ᇿ㄰-㆏]/;
const JP_RE = /[぀-ゟ゠-ヿ一-鿿]/;
function typedInKoreanByMistake(s: string): boolean {
  return !JP_RE.test(s) && HANGUL_RE.test(s);
}

function TypedPanel({
  input,
  disabled,
  onSubmit,
  userAnswer,
  result,
  hintText,
  onHintUsed,
}: {
  input: Extract<QuizCardInput, { mode: "typed" }>;
  disabled: boolean;
  onSubmit: (value: string) => void;
  userAnswer: string | null;
  result: "correct" | "wrong" | null;
  hintText: string | null;
  onHintUsed: () => void;
}) {
  const ariaLabel = input.lang === "ja" ? "読み入력" : "뜻 입력";
  const showImeHint =
    disabled &&
    result === "wrong" &&
    userAnswer !== null &&
    input.lang === "ja" &&
    typedInKoreanByMistake(userAnswer);
  const answerFontFamily =
    input.lang === "ja" ? "var(--font-jp-sans)" : "var(--font-kr-sans)";
  const canonicalAnswer = input.acceptableAnswers[0];
  return (
    <div className="flex flex-col gap-3">
      <TypingInput
        ariaLabel={ariaLabel}
        placeholder={input.placeholder}
        lang={input.lang}
        disabled={disabled}
        onSubmit={onSubmit}
        hintAnswer={hintText}
        onHintUsed={onHintUsed}
      />
      {disabled && result === "wrong" && userAnswer !== null && (
        <div className="flex flex-col gap-1 text-caption text-[color:var(--fg-faint)]">
          <div>
            입력:{" "}
            <span
              className="text-[color:var(--accent-korean)]"
              style={{ fontFamily: answerFontFamily }}
            >
              {userAnswer}
            </span>
          </div>
          {canonicalAnswer && (
            <div>
              정답:{" "}
              <span
                className="text-[color:var(--accent-progress-text)]"
                style={{ fontFamily: answerFontFamily }}
              >
                {canonicalAnswer}
              </span>
            </div>
          )}
          {showImeHint && (
            <div className="text-[color:var(--accent-korean)]">
              한국어로 입력하셨나요? 日本語 키보드로 전환해 주세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
