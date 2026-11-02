"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { pickMimeType, shadowMessage, shadowReducer } from "@/lib/shadow";

/**
 * 따라 말하기: record the learner's voice, play it back to compare by ear with SpeakButton.
 * Nothing is uploaded or persisted — the blob URL lives in memory and is revoked on reset/unmount.
 * Parent should `key` this by card so state resets on card change.
 *
 * TODO(device): re-test on iPhone Safari/PWA. After getUserMedia, iOS may route audio to the
 * receiver (earpiece) only, making SpeakButton / playback quiet; we stop all tracks after
 * recording to release the session, but verify speak -> record -> playback sequencing.
 */
export function ShadowButton() {
  const [state, dispatch] = useReducer(shadowReducer, { kind: "idle" });
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const url = useRef<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const releaseStream = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  const releaseAudio = useCallback(() => {
    audio.current?.pause();
    audio.current = null;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  }, []);

  useEffect(
    () => () => {
      if (rec.current && rec.current.state !== "inactive") {
        rec.current.onstop = null;
        rec.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      releaseAudio();
    },
    [releaseAudio],
  );

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      dispatch({ type: "error", reason: "unsupported" });
      return;
    }
    window.speechSynthesis?.cancel();
    releaseAudio();
    try {
      // Must run inside the tap handler (iOS).
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as DOMException).name;
      dispatch({ type: "error", reason: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "failed" });
      return;
    }
    try {
      const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      r.onstop = () => {
        releaseStream();
        if (!chunks.length) return dispatch({ type: "error", reason: "failed" });
        url.current = URL.createObjectURL(new Blob(chunks, { type: r.mimeType }));
        dispatch({ type: "stop" });
      };
      rec.current = r;
      r.start();
      dispatch({ type: "start" });
    } catch {
      releaseStream();
      dispatch({ type: "error", reason: "failed" });
    }
  }

  function play() {
    if (!url.current) return;
    window.speechSynthesis?.cancel();
    const a = new Audio(url.current);
    audio.current = a;
    a.onended = a.onerror = () => dispatch({ type: "ended" });
    dispatch({ type: "play" });
    a.play().catch(() => dispatch({ type: "ended" }));
  }

  const recording = state.kind === "recording";
  const hasTake = state.kind === "recorded" || state.kind === "playing";
  const msg = shadowMessage(state);
  const icon = "text-[color:var(--fg-faint)] hover:text-[color:var(--fg)] transition-colors";
  const box = "inline-flex items-center justify-center min-w-[44px] min-h-[44px] ";

  return (
    <div className="inline-flex flex-col items-center">
      <div className="inline-flex items-center">
        <button
          type="button"
          onClick={() => (recording ? rec.current?.stop() : start())}
          aria-label={recording ? "녹음 멈추기" : "따라 말하기"}
          aria-pressed={recording}
          className={box + icon}
        >
          {recording ? (
            <span className="block w-2.5 h-2.5 rounded-full bg-[color:var(--accent-clay)] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5.5 11.5a6.5 6.5 0 0013 0 M12 18v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        {hasTake && (
          <button
            type="button"
            onClick={play}
            disabled={state.kind === "playing"}
            aria-label="내 목소리 재생"
            className={box + icon}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 5.5v13l10-6.5-10-6.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <span role="status" aria-live="polite" className="text-label text-[color:var(--fg-faint)] min-h-[1.25em]">
        {msg}
      </span>
    </div>
  );
}
