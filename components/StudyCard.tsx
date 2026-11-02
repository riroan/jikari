"use client";

/**
 * Study card — flashcard browsing UI.
 * Shows front and back information simultaneously (no quizzing, no SRS update).
 * Navigation: bottom prev / next (thumb reach) + horizontal swipe, quiet n / N counter on top.
 */

import { useRef } from "react";
import { SpeakButton } from "./SpeakButton";

export function StudyCard({
  body,
  speak,
  position,
  total,
  onPrev,
  onNext,
}: {
  body: React.ReactNode;
  /** Japanese text to pronounce (study shows both sides, so no answer leak). */
  speak?: string;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  // Horizontal swipe: left = next, right = prev. Vertical scroll stays native (touch-action: pan-y).
  const start = useRef<{ x: number; y: number } | null>(null);
  const btn =
    "flex-1 text-small text-[color:var(--fg-soft)] tracking-wider hover:text-[color:var(--fg)] transition-colors min-h-[52px] inline-flex items-center justify-center";

  return (
    <div className="flex flex-col gap-6 min-h-[520px]">
      <div className="flex justify-center">
        <span
          className="text-label text-[color:var(--fg-faint)] tracking-label tabular-nums font-medium"
          aria-live="polite"
        >
          {position} / {total}
        </span>
      </div>

      <div
        className="min-h-[360px] select-none touch-pan-y"
        onTouchStart={(e) => {
          const t = e.touches[0];
          start.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const s0 = start.current;
          start.current = null;
          if (!s0) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - s0.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > 1.5 * Math.abs(t.clientY - s0.y)) {
            (dx < 0 ? onNext : onPrev)();
          }
        }}
      >
        {body}
      </div>
      {speak && (
        <div className="flex justify-center">
          <SpeakButton text={speak} />
        </div>
      )}

      <div className="flex items-center mt-auto">
        <button onClick={onPrev} className={btn} aria-label="이전 카드">
          ← 이전
        </button>
        <button onClick={onNext} className={btn} aria-label="다음 카드">
          다음 →
        </button>
      </div>
    </div>
  );
}
