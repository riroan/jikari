import type { CardMode, LearningState } from "./types";

/**
 * Leitner box 5-stage SRS
 *
 * Box → days until next review:
 *   1 → 1, 2 → 2, 3 → 4, 4 → 7, 5 → 14
 *
 * Rules:
 *   - Correct: box +1 (cap 5), nextDue = now + intervalDays(newBox)
 *   - Wrong:   box → 1,      nextDue = now + 1 day, correctStreak = 0
 *
 * Daily caps (outside voice catch — prevents day-14 review tsunami):
 *   - New cards: dailyNewLimit introduced per day
 *   - Review:    dailyReviewLimit reviewed per day
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

export function cardKey(mode: CardMode, cardId: string): string {
  return `${mode}:${cardId}`;
}

export function parseCardKey(key: string): { mode: CardMode; cardId: string } {
  const idx = key.indexOf(":");
  return {
    mode: key.slice(0, idx) as CardMode,
    cardId: key.slice(idx + 1),
  };
}

export function newLearningState(
  mode: CardMode,
  cardId: string,
  now: number
): LearningState {
  return {
    cardKey: cardKey(mode, cardId),
    mode,
    cardId,
    box: 1,
    nextDue: now,
    correctStreak: 0,
    lastReviewed: 0,
  };
}

export function advance(
  state: LearningState,
  correct: boolean,
  now: number
): LearningState {
  if (correct) {
    const newBox = Math.min(5, state.box + 1) as 1 | 2 | 3 | 4 | 5;
    return {
      ...state,
      box: newBox,
      nextDue: now + INTERVAL_DAYS[newBox] * DAY_MS,
      correctStreak: state.correctStreak + 1,
      lastReviewed: now,
    };
  }
  return {
    ...state,
    box: 1,
    nextDue: now + DAY_MS,
    correctStreak: 0,
    lastReviewed: now,
  };
}

export interface TodayQueue {
  due: LearningState[];
  new: LearningState[];
}

/**
 * Get today's learning queue, respecting daily caps.
 *
 * - `due`: cards where nextDue <= now, up to dailyReviewLimit
 * - `new`: never-reviewed cards (lastReviewed === 0), up to dailyNewLimit
 */
export function getTodayQueue(
  states: LearningState[],
  now: number,
  limits: { dailyNewLimit: number; dailyReviewLimit: number }
): TodayQueue {
  const due: LearningState[] = [];
  const newCards: LearningState[] = [];

  for (const s of states) {
    if (s.lastReviewed === 0) {
      newCards.push(s);
    } else if (s.nextDue <= now) {
      due.push(s);
    }
  }

  // Due first (more urgent), then new
  due.sort((a, b) => a.nextDue - b.nextDue);

  return {
    due: due.slice(0, limits.dailyReviewLimit),
    new: newCards.slice(0, limits.dailyNewLimit),
  };
}

/**
 * Count of cards that have been mastered (box 4 or 5).
 * Used by progress map to color cells.
 */
export function masteryLevel(state: LearningState | undefined): "new" | "learning" | "mastered" {
  if (!state || state.lastReviewed === 0) return "new";
  if (state.box >= 4) return "mastered";
  return "learning";
}

export const INTERVALS = INTERVAL_DAYS;
