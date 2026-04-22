"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Typing input for active recall.
 *
 * IME safety:
 *   - Swallows Enter while composition is active (iOS Safari · Android Chrome).
 *   - Backs up `isComposing` check with keyCode 229 sentinel (legacy Android).
 *   - Never auto-submits on composition end — always requires explicit Enter.
 *
 * Empty guard: `trim().length === 0` disables submit button and ignores Enter.
 *
 * Accessibility:
 *   - 44×44 tap target floor via min-height.
 *   - Visible focus ring (outline, survives CSS resets).
 *   - `aria-label` required from caller.
 *
 * Visual (DESIGN.md § 6):
 *   - No box-shadow, no border-radius beyond 2px.
 *   - Bottom-border only. Focus darkens the border.
 *   - Noto Sans JP for Japanese, Pretendard for Korean (caller chooses via `lang`).
 */

export interface TypingInputProps {
  ariaLabel: string;
  placeholder?: string;
  /** Affects IME hints + font family. 'ja' opens Japanese IME, 'ko' opens Korean. */
  lang: "ja" | "ko";
  disabled?: boolean;
  autoFocus?: boolean;
  onSubmit: (value: string) => void;
}

export function TypingInput({
  ariaLabel,
  placeholder,
  lang,
  disabled = false,
  autoFocus = true,
  onSubmit,
}: TypingInputProps) {
  const [value, setValue] = useState("");
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      // Defer focus to next tick so AnimatePresence mount transitions finish.
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
  }, [autoFocus, disabled]);

  // iOS soft keyboard covers the input. Re-scroll into view when the visual
  // viewport shrinks (keyboard shows) or on focus (handles keyboard-already-open case).
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const scrollToInput = () => {
      if (document.activeElement === input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    const handleFocus = () => {
      window.setTimeout(scrollToInput, 300);
    };

    const vv = window.visualViewport;
    vv?.addEventListener("resize", scrollToInput);
    input.addEventListener("focus", handleFocus);
    return () => {
      vv?.removeEventListener("resize", scrollToInput);
      input.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Clear input when the card rotates (disabled toggles false → true → false).
  // Caller remounts us for a new card normally, but if they reuse us, reset on disable → enable transition.
  const prevDisabledRef = useRef(disabled);
  useEffect(() => {
    if (prevDisabledRef.current && !disabled) {
      setValue("");
    }
    prevDisabledRef.current = disabled;
  }, [disabled]);

  const canSubmit = !disabled && value.trim().length > 0;

  const submit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit(value);
  }, [canSubmit, onSubmit, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      // Primary guard: native composition flag (all modern browsers).
      // Backup: keyCode 229 (legacy Android, older IMEs).
      if (e.nativeEvent.isComposing || composingRef.current || e.keyCode === 229) {
        return;
      }
      e.preventDefault();
      submit();
    },
    [submit],
  );

  const fontFamily =
    lang === "ja" ? "var(--font-jp-sans)" : "var(--font-kr-sans)";

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        lang={lang}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={() => {
          composingRef.current = false;
        }}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        className="flex-1 bg-transparent text-h2 text-[color:var(--fg)] px-1 py-3 border-0 border-b border-[color:var(--line)] focus:border-[color:var(--fg)] focus:outline-none disabled:opacity-60"
        style={{
          fontFamily,
          minHeight: 44,
          // Focus ring via outline fallback for users who override border in forced-colors mode.
          outlineOffset: 2,
        }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="px-4 py-2 text-[13px] tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ minHeight: 44, minWidth: 60 }}
        aria-label="제출"
      >
        確認
      </button>
    </div>
  );
}
