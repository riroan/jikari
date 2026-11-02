/** Retry delay (ms) after the nth consecutive failure (1-based): 2s, 5s, 15s, then 30s. */
const STEPS = [2000, 5000, 15000, 30000];

export function backoffMs(failures: number): number {
  return STEPS[Math.min(Math.max(failures, 1), STEPS.length) - 1];
}
