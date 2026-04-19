import type { CardMode, LearningState } from "./types";

/**
 * Leitner box 5-stage SRS
 *
 * Box → days until next review:
 *   1 → 1, 2 → 2, 3 → 4, 4 → 7, 5 → 14
 *
 * Rules:
 *   - Correct: box +1 (cap 5), nextDue = now + intervalDays(newBox)
 *   - Wrong (answerMode='choice'): box → 1, nextDue = now + 1 day
 *   - Wrong (answerMode='typed'):  box → max(1, box-1), nextDue = now + 1 day
 *     (typed은 오타·送り仮名·표기 변이로 box 5→1 리셋이 과함. -1 스텝이 공정.)
 *   correctStreak → 0 on any wrong.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

export type AnswerMode = "choice" | "typed";

export type ThresholdBox = 2 | 3 | 4 | 5;

/**
 * Pick quiz input mode based on Leitner box.
 * Box < threshold → 'choice' (recognition — 4지선다).
 * Box ≥ threshold → 'typed'  (active recall — 자유 타이핑).
 *
 * Box 1 cards always stay in 'choice' even if threshold=2 — 신규 카드는 인지부터.
 * threshold 2는 box 1 제외하고 box 2부터 typed.
 */
export function pickMode(
  box: LearningState["box"],
  threshold: ThresholdBox,
): AnswerMode {
  return box >= threshold ? "typed" : "choice";
}

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
  now: number,
  answerMode: AnswerMode = "choice",
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
  const demotedBox =
    answerMode === "typed"
      ? (Math.max(1, state.box - 1) as 1 | 2 | 3 | 4 | 5)
      : 1;
  return {
    ...state,
    box: demotedBox,
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
 * Get today's learning queue.
 *
 * - `due`: cards where nextDue <= now (sorted oldest-due first)
 * - `new`: never-reviewed cards (lastReviewed === 0)
 */
export function getTodayQueue(
  states: LearningState[],
  now: number
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

  due.sort((a, b) => a.nextDue - b.nextDue);

  return { due, new: newCards };
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
