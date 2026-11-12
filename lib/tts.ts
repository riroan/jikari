import { parseMarkup, stripMarkup } from "./jp-markup";
import { SLOW_ONCE_RATE, SPEED_RATES, clampRate, currentRate } from "./tts-speed";
import { audioKey, isReportable } from "./audio-key";

/** `{食|た}べる` / `[[〜]]` markup → plain speakable text (ruby → base kanji). */
export function toSpeakable(text: string): string {
  return stripMarkup(parseMarkup(text)).trim();
}

/*
 * 재생 순서: 미리 만든 음성(GCP Neural2, /api/audio)이 있으면 그 mp3, 없으면 브라우저 Web Speech.
 * 클립 키 목록은 첫 재생 때 한 번 받아 둔다. 목록이 오기 전·클립이 없는 문장은 Web Speech로
 * 읽고, 한자가 든 문장이면 "음성 없음"으로 신고해 다음 scripts/gen-audio.ts 실행 때 만든다.
 * 모든 판단은 동기 — iOS는 탭 핸들러 밖의 재생을 막는다.
 */
let clipKeys: Set<string> | null = null;
let loadingKeys = false;

function loadClipKeys(): void {
  if (clipKeys || loadingKeys || typeof fetch === "undefined") return;
  loadingKeys = true;
  fetch("/api/audio")
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { keys?: string[] } | null) => {
      clipKeys = new Set(d?.keys ?? []);
    })
    .catch(() => {})
    .finally(() => {
      loadingKeys = false;
    });
}

/** 앱 시작 때 미리 불러 두면 첫 재생부터 고품질 음성이 나온다. */
export const primeSpeech = loadClipKeys;

const reported = new Set<string>();
function reportMissing(plain: string): void {
  if (reported.has(plain) || !isReportable(plain)) return;
  reported.add(plain);
  fetch("/api/audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: plain }),
    keepalive: true,
  }).catch(() => {});
}

// iOS WebKit may GC an utterance/audio mid-play (silent cut-off) — hold a reference.
let current: SpeechSynthesisUtterance | null = null;
let audio: HTMLAudioElement | null = null;

/** 재생 중인 소리(클립·Web Speech)를 멈춘다 — 녹음·음성 인식 전에 부른다. */
export function stopSpeaking(): void {
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
}

function speakWeb(plain: string, rate: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = "ja-JP";
  u.rate = clampRate(rate);
  const voice = synth.getVoices().find((v) => v.lang.replace("_", "-") === "ja-JP");
  if (voice) u.voice = voice;
  current = u;
  u.onend = u.onerror = () => {
    if (current === u) current = null;
  };
  // Safari drops a speak() issued in the same tick as cancel(); only pay the delay when needed.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => current === u && synth.speak(u), 60);
  } else {
    synth.speak(u);
  }
}

/**
 * Speak Japanese. Must be called from a user tap handler (iOS).
 * Cancels anything in flight. No-op if nothing can play.
 */
export function speak(text: string, rate: number = currentRate()): void {
  if (typeof window === "undefined") return;
  const plain = toSpeakable(text);
  if (!plain) return;
  loadClipKeys();
  const key = audioKey(plain);
  if (clipKeys?.has(key) && typeof Audio !== "undefined") {
    if (audio) audio.pause();
    window.speechSynthesis?.cancel();
    const a = new Audio(`/api/audio/${key}`);
    // 클립은 자연 속도(1.0)로 만들었다. Web Speech 기본(0.9)을 1.0에 맞춘 비율로 늦춘다.
    a.playbackRate = clampRate(rate) / SPEED_RATES.normal;
    audio = a;
    a.play().catch(() => {
      if (audio === a) speakWeb(plain, rate);
    });
    return;
  }
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (clipKeys) reportMissing(plain);
  speakWeb(plain, rate);
}

/** Replay slower than any preference (「느리게」 control). */
export const speakSlow = (text: string) => speak(text, SLOW_ONCE_RATE);
