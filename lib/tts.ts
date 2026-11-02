import { parseMarkup, stripMarkup } from "./jp-markup";

/** `{食|た}べる` / `[[〜]]` markup → plain speakable text (ruby → base kanji). */
export function toSpeakable(text: string): string {
  return stripMarkup(parseMarkup(text)).trim();
}

/**
 * Speak Japanese via Web Speech API. Must be called from a user tap handler
 * (iOS Safari). Cancels any utterance in flight. No-op if unsupported.
 */
// iOS WebKit may GC an utterance mid-speech (silent cut-off) — hold a reference.
let current: SpeechSynthesisUtterance | null = null;

export function speak(text: string, rate = 0.9): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const plain = toSpeakable(text);
  if (!plain) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = "ja-JP";
  u.rate = rate;
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
