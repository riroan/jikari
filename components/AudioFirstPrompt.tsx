"use client";

import { useEffect, useState } from "react";
import { speak, speakSlow } from "@/lib/tts";

/** Opt-in (per device) audio-first sentence prompt for high-box cards. */
export const AUDIO_FIRST_KEY = "jikari-sentence-audio-first";
export const AUDIO_FIRST_MIN_BOX = 3;
export const isOnOff = (raw: string): raw is "on" | "off" => raw === "on" || raw === "off";

const VOICE_WAIT_MS = 1500;

/** "pending" = voices not loaded yet (Chromium loads them async); "none" = fall back to text. */
type VoiceState = "ja" | "none" | "pending";

function readVoices(): VoiceState {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return "none";
  return window.speechSynthesis.getVoices().some((v) => v.lang.replace("_", "-") === "ja-JP")
    ? "ja"
    : "pending";
}

function useJaVoice(): VoiceState {
  const [state, setState] = useState<VoiceState>(readVoices);
  useEffect(() => {
    if (state !== "pending") return;
    const synth = window.speechSynthesis;
    const check = () => {
      const next = readVoices();
      if (next === "ja") setState("ja");
    };
    synth.addEventListener?.("voiceschanged", check);
    const t = setTimeout(() => setState((s) => (s === "pending" ? "none" : s)), VOICE_WAIT_MS);
    return () => {
      synth.removeEventListener?.("voiceschanged", check);
      clearTimeout(t);
    };
  }, [state]);
  return state;
}

/**
 * Hides `children` (the sentence) behind a large speaker button until 「문장 보기」.
 * Never auto-speaks (iOS needs a user gesture). Falls back to children when no ja-JP voice.
 */
export function AudioFirstPrompt({
  speakText,
  children,
}: {
  speakText: string;
  children: React.ReactNode;
}) {
  const voice = useJaVoice();
  const [revealed, setRevealed] = useState(false);
  if (revealed || voice === "none") return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-2 py-2" data-testid="audio-first">
      <button
        type="button"
        onClick={() => speak(speakText)}
        aria-label="문장 듣기"
        className="inline-flex items-center justify-center rounded-full border border-[color:var(--line)] text-[color:var(--fg)]"
        style={{ width: 72, height: 72 }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z M15.5 9a4 4 0 010 6 M18 6.5a7.5 7.5 0 010 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => speakSlow(speakText)}
          aria-label="천천히 듣기"
          className="min-h-[44px] px-3 text-caption text-[color:var(--fg-faint)]"
        >
          느리게
        </button>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="min-h-[44px] px-3 text-caption text-[color:var(--fg-soft)]"
        >
          문장 보기
        </button>
      </div>
    </div>
  );
}
