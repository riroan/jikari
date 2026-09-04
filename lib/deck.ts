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
 * Adaptive-difficulty weighting for {@link weightedShuffleIds}. Omit it and the
 * deck is box-weighted only — exactly the pre-rating behaviour.
 */
export interface DifficultyWeighting {
  /** Item difficulty on the rating scale (see lib/rating.ts). */
  difficultyOf: (id: string) => number;
  /** The user's current rating for this mode. */
  rating: number;
}

/**
 * Aim slightly *above* the user so the deck stays "just hard enough" instead of
 * comfortable. 50 ≈ a fifth of the gap between two JLPT bands.
 */
const TARGET_OFFSET = 50;

/**
 * Half-weight distance from the target, in rating points. At 250 (= one JLPT
 * band) the neighbouring level still shows up often and the level after that
 * occasionally, so progress feels gradual rather than gated.
 *
 * ponytail: Cauchy-shaped rather than Gaussian — no exp(), same shape where it
 * matters, fatter tails so nothing is ever fully locked out. TARGET_OFFSET and
 * BAND_WIDTH are the tuning knobs; neither is fitted to real answer data yet.
 */
const BAND_WIDTH = 250;

function difficultyWeight(difficulty: number, rating: number): number {
  const z = (difficulty - rating - TARGET_OFFSET) / BAND_WIDTH;
  return 1 / (1 + z * z);
}

/** hashSeedId is a uint32; divide to get a deterministic [0, 1) draw. */
const UINT32 = 0x1_0000_0000;

/**
 * Box-weighted deck, optionally narrowed to the user's difficulty band.
 *
 * Each id is included with probability `1/INTERVAL_DAYS[box] * difficultyWeight`,
 * then the surviving set is shuffled with the given seed. The two factors answer
 * different questions and multiply cleanly: the box says *when* a card is due,
 * the difficulty weight says whether it is worth asking *now*.
 *
 * Deterministic per (seed, box-snapshot, rating) — callers should pass
 * `seed + epoch * k` so each epoch gets a fresh sample without invalidating
 * mid-epoch.
 *
 * Fallback: if no ids survive (everything at high box + adversarial hash),
 * the full deck is shuffled instead — we never want an empty quiz.
 */
export function weightedShuffleIds(
  ids: readonly string[],
  getBox: (id: string) => 1 | 2 | 3 | 4 | 5,
  seed: number,
  weighting?: DifficultyWeighting,
): string[] {
  const kept: string[] = [];
  for (const id of ids) {
    const p =
      (1 / BOX_INTERVAL[getBox(id)]) *
      (weighting
        ? difficultyWeight(weighting.difficultyOf(id), weighting.rating)
        : 1);
    if (hashSeedId(seed, id) / UINT32 < p) kept.push(id);
  }
  if (kept.length === 0) return shuffleIds(ids, seed);
  return shuffleIds(kept, seed);
}
