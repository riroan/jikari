/**
 * Infinite random deck iteration.
 *
 * Shuffles ids, tracks position, auto-reshuffles when exhausted.
 * Deterministic given a seed — useful for tests and consistency across renders.
 */

export function shuffleIds<T>(ids: readonly T[], seed: number): T[] {
  const copy = ids.slice();
  let s = seed | 0;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const j = Math.floor(r * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
