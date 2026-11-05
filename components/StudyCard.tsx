"use client";

/**
 * Study card — flashcard browsing UI.
 * Shows front and back information simultaneously (no quizzing, no SRS update).
 * Navigation: bottom prev / next (thumb reach) + horizontal swipe, quiet n / N counter on top.
 * 데스크톱: ← / → 키로 넘긴다.
 */

import { useEffect, useRef } from "react";
import { SpeakButton } from "./SpeakButton";
import { ShadowButton } from "./ShadowButton";

export function StudyCard({
  body,
  speak,
  shadow,
  position,
  total,
  onPrev,
  onNext,
}: {
  body: React.ReactNode;
  /** Japanese text to pronounce (study shows both sides, so no answer leak). */
  speak?: string;
  /** Show the 따라 말하기 record/playback button next to the speaker. */
  shadow?: boolean;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  // Horizontal swipe: left = next, right = prev. Vertical scroll stays native (touch-action: pan-y).
  const start = useRef<{ x: number; y: number } | null>(null);
  // 키 핸들러는 한 번만 달고, 최신 콜백은 ref로 읽는다 (카드마다 리스너를 갈아 끼우지 않게).
  const nav = useRef({ onPrev, onNext });
  useEffect(() => {
    nav.current = { onPrev, onNext };
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if ((e.target as HTMLElement | null)?.closest?.("input,textarea,select,[contenteditable]")) return;
      if (e.key === "ArrowRight") nav.current.onNext();
      else if (e.key === "ArrowLeft") nav.current.onPrev();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const btn =
    "flex-1 text-small text-[color:var(--fg-soft)] tracking-wider hover:text-[color:var(--fg)] transition-colors min-h-[44px] py-4 inline-flex items-center justify-center";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-center">
        <span
          className="text-label text-[color:var(--fg-faint)] tracking-label tabular-nums font-medium"
          aria-live="polite"
        >
          {position} / {total}
        </span>
      </div>

      <div
        className="min-h-[360px] select-none touch-pan-y [-webkit-touch-callout:none]"
        onTouchStart={(e) => {
          const t = e.touches[0];
          // Left-edge starts belong to iOS back-swipe.
          if (t.clientX < 20) return;
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
        <div className="flex justify-center items-start gap-2">
          <SpeakButton text={speak} />
          {shadow && <ShadowButton key={speak} />}
        </div>
      )}

      {/*
        이전/다음은 화면 하단에 고정한다. 내용 바로 아래에 두면 예시가 많은 카드에서
        버튼이 아래로 밀려 넘길 때마다 엄지 위치가 바뀌었다. body의 overflow-x:hidden
        때문에 sticky가 듣지 않아 fixed + 아래 여백(spacer)으로 둔다.
        ModePageShell의 하단 "홈으로"는 이 줄이 있으면 숨긴다 (data-study-nav).
      */}
      <div aria-hidden className="h-[calc(4rem+var(--sync-gap))]" />
      <div
        data-study-nav
        className="fixed inset-x-0 bottom-0 z-30 bg-[color:var(--bg)] border-t border-[color:var(--line)] pl-[var(--safe-left)] pr-[var(--safe-right)] pb-[calc(var(--safe-bottom)+var(--sync-gap))]"
      >
        <div className="mx-auto w-full max-w-[390px] lg:max-w-[600px] px-6 flex items-center">
          <button onClick={onPrev} className={btn} aria-label="이전 카드">
            ← 이전
          </button>
          <button onClick={onNext} className={btn} aria-label="다음 카드">
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
}
