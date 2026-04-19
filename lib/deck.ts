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

/**
 * Inclusion probability per Leitner box — 1 / INTERVAL_DAYS.
 * Matches the SRS cadence so a box-5 card appears in roughly 1/14 of epochs,
 * while box-1 cards always appear. Keeps the quiz deck aligned with how
 * "due" the user is for that card.
 */
const BOX_INTERVAL: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

function hashSeedId(seed: number, id: string): number {
  let h = seed | 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 2654435761) | 0;
  }
  return h >>> 0;
}

/**
 * Box-weighted deck. Each id is included with probability 1/INTERVAL_DAYS[box],
 * then the surviving set is shuffled with the given seed.
 *
 * Deterministic per (seed, box-snapshot) — callers should pass `seed + epoch * k`
 * so each epoch gets a fresh sample without invalidating mid-epoch.
 *
 * Fallback: if no ids survive (everything at high box + adversarial hash),
 * the full deck is shuffled instead — we never want an empty quiz.
 */
export function weightedShuffleIds(
  ids: readonly string[],
  getBox: (id: string) => 1 | 2 | 3 | 4 | 5,
  seed: number,
): string[] {
  const kept: string[] = [];
  for (const id of ids) {
    const interval = BOX_INTERVAL[getBox(id)];
    if (hashSeedId(seed, id) % interval === 0) kept.push(id);
  }
  if (kept.length === 0) return shuffleIds(ids, seed);
  return shuffleIds(kept, seed);
}
