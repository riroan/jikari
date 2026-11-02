import { parseMarkup, stripMarkup } from "./jp-markup";

/** `{食|た}べる` / `[[〜]]` markup → plain speakable text (ruby → base kanji). */
export function toSpeakable(text: string): string {
  return stripMarkup(parseMarkup(text)).trim();
}

/**
 * Speak Japanese via Web Speech API. Must be called from a user tap handler
 * (iOS Safari). Cancels any utterance in flight. No-op if unsupported.
 */
export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const plain = toSpeakable(text);
  if (!plain) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = "ja-JP";
  u.rate = 0.9;
  const voice = synth.getVoices().find((v) => v.lang.replace("_", "-") === "ja-JP");
  if (voice) u.voice = voice;
  synth.cancel();
  synth.speak(u);
}
