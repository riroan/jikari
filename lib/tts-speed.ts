/** Per-device speech speed preference (localStorage only — not in the progress store/DB). */
export type SpeechSpeed = "normal" | "slow";

export const SPEED_KEY = "jikari-speech-speed";
export const SPEED_RATES: Record<SpeechSpeed, number> = { normal: 0.9, slow: 0.7 };
/** One-shot 「느리게」 replay: always slower than either preference. */
export const SLOW_ONCE_RATE = 0.6;

export const isSpeechSpeed = (raw: string): raw is SpeechSpeed => raw === "normal" || raw === "slow";

export function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return SPEED_RATES.normal;
  return Math.min(1.5, Math.max(0.5, rate));
}

export function getSpeechSpeed(): SpeechSpeed {
  try {
    const raw = localStorage.getItem(SPEED_KEY);
    if (raw !== null && isSpeechSpeed(raw)) return raw;
  } catch {
    // privacy mode — fall back to default
  }
  return "normal";
}

export function currentRate(): number {
  return clampRate(SPEED_RATES[getSpeechSpeed()]);
}
