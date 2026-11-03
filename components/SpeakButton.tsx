"use client";

import { speak, speakSlow } from "@/lib/tts";

/** Quiet speaker icon; 44px tap target. Only render where the answer is already revealed. */
export function SpeakButton({ text, slow = false }: { text: string; slow?: boolean }) {
  const main = (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label="발음 듣기"
      className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z M15.5 9a4 4 0 010 6 M18 6.5a7.5 7.5 0 010 11"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
  if (!slow) return main;
  return (
    <>
      {main}
      <button
        type="button"
        onClick={() => speakSlow(text)}
        aria-label="천천히 듣기"
        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] px-1 text-caption text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] transition-colors"
      >
        느리게
      </button>
    </>
  );
}
