"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CardMode,
  LearningState,
  PersistedState,
  QuizStat,
  QuizStatKey,
} from "./types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "./types";
import { normalizeDailyGoal } from "./daily-goal";
import {
  advance as srsAdvance,
  cardKey,
  getTodayQueue as srsGetTodayQueue,
  newLearningState,
  takeSlow,
  type AnswerMode,
  type TodayQueue,
} from "./srs";
import { incrementToday, currentStreak, toLocalDateKey } from "./heatmap";
import {
  DEFAULT_PROGRESSION,
  addReward,
  buyFreeze,
  consumeFreezes,
  earn,
  normalizeProgression,
  redeemReward,
  removeReward,
  setPalette,
  unlockPalette,
  type Progression,
} from "./progression";
import { INITIAL_RATING, updateRating } from "./rating";
import { remoteStorage } from "./remote-storage";
import { recordMissAnswer } from "./misses";
import { collectExtras } from "./extras";

interface StoreActions {
  /**
   * Record a review result for a card. Creates state if new.
   * `answerMode` defaults to 'choice'. Pass 'typed' for active-recall attempts —
   * this softens the demotion on wrong answers (box-1 instead of box-1 reset).
   *
   * `difficulty` (see lib/rating.ts) additionally moves the mode's adaptive
   * rating. Omit it and the rating is left untouched — pages wire it in as
   * each one gets a difficulty source.
   */
  review: (
    mode: CardMode,
    cardId: string,
    correct: boolean,
    answerMode?: AnswerMode,
    difficulty?: number,
  ) => void;

  /**
   * review()를 부르지 않는 연습(문장 만들기·음독)의 포인트 적립. SRS·히트맵은 그대로.
   * `key`는 반복 적립 방지용 (예: "build:s12").
   */
  earnPractice: (key: string, correct: boolean, typed: boolean) => void;

  /**
   * 상점 — 살 수 없으면(잔액 부족 등) false. kind별 인자:
   * freeze / palette(id) / redeem(rewardId) / add(name, cost) / remove(rewardId) / use(paletteId, ""=기본)
   */
  shop: (
    action:
      | { kind: "freeze" }
      | { kind: "palette"; id: string }
      | { kind: "redeem"; id: string }
      | { kind: "add"; name: string; cost: number }
      | { kind: "remove"; id: string }
      | { kind: "use"; id: string },
  ) => boolean;

  /** Increment the lifetime ◯/✕ tally for a page. */
  recordQuizResult: (key: QuizStatKey, correct: boolean) => void;

  /** Get today's queue for a specific mode. */
  getQueueForMode: (mode: CardMode, allCardIds: string[]) => TodayQueue;

  /** Get a single card's learning state (or undefined if never seen). */
  getState: (mode: CardMode, cardId: string) => LearningState | undefined;

  /** Get the Leitner box for a card, or 1 if never seen. */
  getBox: (mode: CardMode, cardId: string) => LearningState["box"];

  /** Update settings. */
  updateSettings: (partial: Partial<PersistedState["settings"]>) => void;

  /** Set nextDue for many cards in ONE update (respace / undo). Nothing else changes. */
  setNextDues: (changes: Record<string, number>) => void;

  /** Replace entire state (used by import). */
  replaceAll: (next: PersistedState) => void;

  /** Reset to empty state. */
  reset: () => void;
}

type Store = PersistedState & StoreActions;

const initialState: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  learningStates: {},
  heatmap: {},
  lastActiveAt: 0,
  currentStreak: 0,
  quizStats: {},
  ratings: {},
  progression: DEFAULT_PROGRESSION,
  settings: { ...DEFAULT_SETTINGS },
};

const progOf = (s: PersistedState): Progression => s.progression ?? DEFAULT_PROGRESSION;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      review: (mode, cardId, correct, answerMode = "choice", difficulty) => {
        const now = Date.now();
        recordMissAnswer(mode, cardId, correct, now);
        const key = cardKey(mode, cardId);
        const states = get().learningStates;
        const existing = states[key];
        const base = existing ?? newLearningState(mode, cardId, now);
        const next = srsAdvance(base, correct, now, answerMode, takeSlow());
        // 오늘 첫 답이면 그 전의 빈 날을 휴식권으로 메운 뒤 연속을 센다.
        let progression = consumeFreezes(progOf(get()), get().heatmap, now);
        const heatmap = incrementToday(get().heatmap, now);
        const streak = currentStreak(heatmap, now, progression.frozenDays);
        progression = earn(progression, {
          key,
          correct,
          typed: answerMode === "typed",
          difficulty,
          // 연속 정답 3회 뒤의 승급만 — 5단계에서 일부러 틀리고 다시 맞혀 +5를 반복하는 루프 차단.
          mastered: base.box < 5 && next.box === 5 && base.correctStreak >= 3,
          todayCount: heatmap[toLocalDateKey(now)] ?? 0,
          dailyGoal: get().settings.dailyGoal,
          streak,
          now,
        });
        const ratings = get().ratings;
        set({
          learningStates: { ...states, [key]: next },
          heatmap,
          lastActiveAt: now,
          currentStreak: streak,
          progression,
          ratings:
            difficulty === undefined
              ? ratings
              : {
                  ...ratings,
                  [mode]: updateRating(
                    ratings[mode] ?? INITIAL_RATING,
                    difficulty,
                    correct,
                  ),
                },
        });
      },

      earnPractice: (key, correct, typed) => {
        const now = Date.now();
        set({
          progression: earn(progOf(get()), {
            key,
            correct,
            typed,
            mastered: false,
            todayCount: 0, // 히트맵에 안 잡히는 연습이라 하루 목표·연속 보너스는 review() 몫
            dailyGoal: Infinity,
            streak: 0,
            now,
          }),
        });
      },

      shop: (a) => {
        const p = progOf(get());
        const now = Date.now();
        const next =
          a.kind === "freeze" ? buyFreeze(p, now)
          : a.kind === "palette" ? unlockPalette(p, a.id, now)
          : a.kind === "redeem" ? redeemReward(p, a.id, now)
          : a.kind === "add" ? addReward(p, a.name, a.cost, now)
          : a.kind === "remove" ? removeReward(p, a.id)
          : setPalette(p, a.id);
        if (!next) return false;
        set({ progression: next });
        return true;
      },

      recordQuizResult: (key, correct) => {
        const prev: QuizStat = get().quizStats[key] ?? { correct: 0, wrong: 0 };
        const next: QuizStat = correct
          ? { ...prev, correct: prev.correct + 1 }
          : { ...prev, wrong: prev.wrong + 1 };
        set({ quizStats: { ...get().quizStats, [key]: next } });
      },

      getQueueForMode: (mode, allCardIds) => {
        const states = get().learningStates;
        const now = Date.now();

        const modeStates: LearningState[] = allCardIds.map((cardId) => {
          const key = cardKey(mode, cardId);
          return states[key] ?? newLearningState(mode, cardId, now);
        });

        return srsGetTodayQueue(modeStates, now);
      },

      getState: (mode, cardId) => get().learningStates[cardKey(mode, cardId)],

      getBox: (mode, cardId) =>
        get().learningStates[cardKey(mode, cardId)]?.box ?? 1,

      updateSettings: (partial) =>
        set({ settings: { ...get().settings, ...partial } }),

      setNextDues: (changes) => {
        const states = { ...get().learningStates };
        for (const [k, nextDue] of Object.entries(changes)) {
          if (states[k]) states[k] = { ...states[k], nextDue };
        }
        set({ learningStates: states });
      },

      replaceAll: (next) => set({ ...next }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: "jikari-state",
      storage: createJSONStorage(() => remoteStorage),
      version: SCHEMA_VERSION,
      /**
       * Skip automatic hydration — HydrationBoundary triggers `rehydrate()`
       * in a client-only `useEffect`, so SSR / static generation never hits
       * the remote API.
       */
      skipHydration: true,
      /**
       * Schema migration: pad missing settings fields with defaults.
       * v1 → v2: added settings.showFurigana (default true)
       * v2 → v3: removed settings.dailyNewLimit / dailyReviewLimit
       * v3 → v4: added settings.typingThresholdBox (default 4)
       * v4 → v5: added quizStats (lifetime ◯/✕ per page)
       * v5 → v6: added ratings (adaptive difficulty per CardMode)
       * v6 → v7: added progression (points / 級段 / rewards)
       */
      migrate: (persisted: unknown, _version: number) => {
        if (!persisted || typeof persisted !== "object") return initialState;
        const p = persisted as Partial<PersistedState> & { settings?: Partial<PersistedState["settings"]> };
        const prev: Partial<PersistedState["settings"]> = p.settings ?? {};
        return {
          ...initialState,
          ...p,
          schemaVersion: SCHEMA_VERSION,
          quizStats: p.quizStats ?? {},
          ratings: p.ratings ?? {},
          progression: normalizeProgression(p.progression),
          settings: {
            theme: prev.theme ?? DEFAULT_SETTINGS.theme,
            showFurigana: prev.showFurigana ?? DEFAULT_SETTINGS.showFurigana,
            typingThresholdBox:
              prev.typingThresholdBox ?? DEFAULT_SETTINGS.typingThresholdBox,
            dailyGoal: normalizeDailyGoal(prev.dailyGoal),
          },
        } as PersistedState;
      },
    }
  )
);

/** Export current store state as a backup JSON string. */
export function exportState(): string {
  const state = useStore.getState();
  const backup: PersistedState = {
    schemaVersion: state.schemaVersion,
    learningStates: state.learningStates,
    heatmap: state.heatmap,
    lastActiveAt: state.lastActiveAt,
    currentStreak: state.currentStreak,
    quizStats: state.quizStats,
    ratings: state.ratings,
    progression: state.progression,
    settings: state.settings,
  };
  return JSON.stringify({ ...backup, extras: collectExtras() }, null, 2);
}

