import type { CardMode, LearningState } from "./types";

/**
 * Leitner box 5-stage SRS
 *
 * Box → days until next review:
 *   1 → 1, 2 → 2, 3 → 4, 4 → 7, 5 → 14
 *
 * Rules:
 *   - Correct: box +1 (cap 5), nextDue = now + intervalDays(newBox)
 *   - Correct at box 5: interval = 2 × time actually survived since the last
 *     review, clamped to [14, 180] days (see {@link graduatedIntervalMs})
 *   - Wrong (answerMode='choice'): box → 1, nextDue = now + 1 day
 *   - Wrong (answerMode='typed'):  box → max(1, box-1), nextDue = now + 1 day
 *     (typed은 오타·送り仮名·표기 변이로 box 5→1 리셋이 과함. -1 스텝이 공정.)
 *   correctStreak → 0 on any wrong.
 *   - Slow correct (see {@link markAnswered}): box held, nextDue = now + the
 *     current box's interval (box 5: the already-scheduled gap if longer).
 *     Never demotes; wrong answers are unaffected.
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

/** 0 = typing off (always 4-choice). */
export type ThresholdBox = 0 | 2 | 3 | 4 | 5;

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
  return threshold !== 0 && box >= threshold ? "typed" : "choice";
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

/** Longest gap between reviews of a box-5 card. */
export const MAX_INTERVAL_DAYS = 180;

/**
 * A fixed 14-day cap brings every mastered card back twice a month forever,
 * so review load grows with the deck instead of with what is still shaky.
 * Box 5 instead doubles the gap the card just survived — derived from
 * lastReviewed alone, so no extra column is stored.
 *
 * Elapsed time, not the scheduled interval: the quiz deck can serve a card
 * before it is due, and an early correct answer proves nothing new, so it
 * falls back to the 14-day floor rather than doubling a schedule it never
 * tested.
 */
function graduatedIntervalMs(state: LearningState, now: number): number {
  const floor = INTERVAL_DAYS[5] * DAY_MS;
  if (state.box < 5 || state.lastReviewed === 0) return floor;
  const survived = now - state.lastReviewed;
  return Math.min(MAX_INTERVAL_DAYS * DAY_MS, Math.max(floor, 2 * survived));
}

/** A correct answer slower than this holds the box instead of promoting. */
export const SLOW_CHOICE_MS = 8_000;
export const SLOW_TYPED_MS = 15_000;
/** Longer gaps are "unknown" (phone lock, walked away): promote normally. */
export const MAX_THINK_MS = 60_000;

let shownAt = 0;
let hiddenSinceShown = false;
let slowPending = false;
let visibilityBound = false;

/** Call when a question appears (mount and after each advance). */
export function markShown(): void {
  if (typeof document === "undefined") return;
  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) hiddenSinceShown = true;
    });
  }
  shownAt = Date.now();
  hiddenSinceShown = document.hidden;
  slowPending = false;
}

/**
 * Call at the moment the answer is given (not when 다음 is pressed — review()
 * runs later). Returns whether it was slow; review() consumes the same flag.
 */
export function markAnswered(mode: AnswerMode): boolean {
  const ms = Date.now() - shownAt;
  const limit = mode === "typed" ? SLOW_TYPED_MS : SLOW_CHOICE_MS;
  slowPending =
    shownAt > 0 &&
    !hiddenSinceShown &&
    !(typeof document !== "undefined" && document.hidden) &&
    ms > limit &&
    ms <= MAX_THINK_MS;
  return slowPending;
}

/** Read-and-clear, so a flag never leaks onto a later review. */
export function takeSlow(): boolean {
  const v = slowPending;
  slowPending = false;
  return v;
}

export function advance(
  state: LearningState,
  correct: boolean,
  now: number,
  answerMode: AnswerMode = "choice",
  slow = false,
): LearningState {
  if (correct && slow) {
    // Box 5 may already be graduated beyond 14 days: hold that interval, don't shorten it.
    const prev = state.box === 5 && state.lastReviewed > 0 ? state.nextDue - state.lastReviewed : 0;
    return {
      ...state,
      nextDue: now + Math.max(INTERVAL_DAYS[state.box] * DAY_MS, prev),
      correctStreak: state.correctStreak + 1,
      lastReviewed: now,
    };
  }
  if (correct) {
    const newBox = Math.min(5, state.box + 1) as 1 | 2 | 3 | 4 | 5;
    return {
      ...state,
      box: newBox,
      nextDue:
        now +
        (newBox === 5 ? graduatedIntervalMs(state, now) : INTERVAL_DAYS[newBox] * DAY_MS),
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
