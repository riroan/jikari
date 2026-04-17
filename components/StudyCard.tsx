"use client";

/**
 * Study card — flashcard browsing UI.
 * Shows front and back information simultaneously (no quizzing, no SRS update).
 * Navigation: prev / next with position counter.
 */

export function StudyCard({
  body,
  position,
  total,
  onPrev,
  onNext,
}: {
  body: React.ReactNode;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-8 min-h-[520px]">
      <div className="min-h-[360px]">{body}</div>

      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="text-[14px] text-[color:var(--fg-soft)] tracking-wider hover:text-[color:var(--fg)] transition-colors px-3 py-2"
          aria-label="이전 카드"
        >
          ← 이전
        </button>

        <span
          className="text-[12px] text-[color:var(--fg-faint)] tracking-[0.18em] tabular-nums font-medium"
          aria-live="polite"
        >
          {position} / {total}
        </span>

        <button
          onClick={onNext}
          className="text-[14px] text-[color:var(--fg-soft)] tracking-wider hover:text-[color:var(--fg)] transition-colors px-3 py-2"
          aria-label="다음 카드"
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
