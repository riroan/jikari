"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  /** Called after feedback, caller advances to next card */
  onResolved: (wasCorrect: boolean, wrongPick?: string) => void;
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
  const resolvedAtRef = useRef(0);

  const advance = useCallback(() => {
    if (result === null) return;
    // Assisted answers never promote the card: report them as a miss.
    const ok = result === "correct" && !hinted;
    if (result === "wrong" && selectedChoice !== null) onResolved(ok, selectedChoice);
    else onResolved(ok);
    setHinted(false);
    markShown();
    setResult(null);
    setDisabled(false);
    setShowingBack(false);
    setSelectedChoice(null);
    setTypedUserAnswer(null);
  }, [result, hinted, selectedChoice, onResolved]);

  const resolve = useCallback(
    (wasCorrect: boolean) => {
      setResult(wasCorrect ? "correct" : "wrong");
      setDisabled(true);
      resolvedAtRef.current = Date.now();
      // 느린 정답은 박스를 유지하도록 기록만 한다 (화면 문구는 없음).
      markAnswered(input.mode);
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

  // 데스크톱: 1–4 키로 선지를 고른다 (답한 뒤에는 Space/Enter가 다음으로 넘긴다).
  useEffect(() => {
    if (disabled || input.mode !== "choice") return;
    const choices = input.choices;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > choices.length) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input,textarea,[contenteditable]")) return;
      e.preventDefault();
      handleChoice(choices[n - 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, input, handleChoice]);

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
          {disabled && result !== null && (
              <div key={result} className="anim-fade-in">
                <AnswerFeedback correct={result === "correct"} />
              </div>
            )}
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
        <div
          className="anim-fade-in -mt-3 flex flex-col gap-2"
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
        </div>
      )}
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
  // 데스크톱에서 선지가 모두 짧으면 2×2로 놓아 시선 이동을 줄인다 (긴 문장 선지는 한 줄씩).
  const short = choices.every((c) => c.replace(/\{([^|}]+)\|[^}]+\}/g, "$1").length <= 14);

  return (
    <div
      className={`flex flex-col gap-2 ${short ? "lg:grid lg:grid-cols-2 lg:gap-3" : ""}`}
      style={{ fontFamily: choiceFontFamily }}
    >
      {choices.map((choice, i) => {
        const isSelected = selected === choice;
        const isCorrectChoice = choice === correct;
        const resultLabel = disabled
          ? isCorrectChoice
            ? isSelected ? "선택 · 정답" : "정답"
            : isSelected ? "선택 · 오답" : null
          : null;
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
            className={`flex w-full items-baseline gap-3 text-left px-4 py-3.5 text-body text-[color:var(--fg)] border rounded-sm transition-colors ${stateClass} disabled:cursor-not-allowed`}
          >
            {/* 숫자 키 단축키 표시 — 키보드가 있는 데스크톱에서만 */}
            <span
              aria-hidden
              className="hidden lg:inline text-tiny tabular-nums text-[color:var(--fg-faint)]"
              style={{ fontFamily: "var(--font-kr-sans)" }}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <RubyText text={choice} />
            </span>
            {resultLabel && (
              <>
                {" "}
                <span className="shrink-0 text-caption text-[color:var(--fg-soft)]">
                  {resultLabel}
                </span>
              </>
            )}
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
