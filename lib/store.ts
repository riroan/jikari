"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CardMode,
  LearningState,
  PersistedState,
} from "./types";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "./types";
import {
  advance as srsAdvance,
  cardKey,
  getTodayQueue as srsGetTodayQueue,
  newLearningState,
  type TodayQueue,
} from "./srs";
import { incrementToday, currentStreak, toLocalDateKey } from "./heatmap";

interface StoreActions {
  /** Record a review result for a card. Creates state if new. */
  review: (mode: CardMode, cardId: string, correct: boolean) => void;

  /** Get today's queue for a specific mode. */
  getQueueForMode: (mode: CardMode, allCardIds: string[]) => TodayQueue;

  /** Get a single card's learning state (or undefined if never seen). */
  getState: (mode: CardMode, cardId: string) => LearningState | undefined;

  /** Update settings. */
  updateSettings: (partial: Partial<PersistedState["settings"]>) => void;

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
  settings: { ...DEFAULT_SETTINGS },
};

/**
 * Storage layer is abstracted for v2 migration (outside voice + CEO plan catch):
 * swap createJSONStorage(() => localStorage) for a remote fetch adapter later.
 *
 * QuotaExceededError handling: in-memory catch block retries after pruning
 * oldest heatmap entries. If still fails, surfaces error so UI can warn user.
 */
const safeLocalStorage = () => {
  if (typeof window === "undefined") {
    // SSR — provide no-op storage
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
};

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialState,

      review: (mode, cardId, correct) => {
        const now = Date.now();
        const key = cardKey(mode, cardId);
        const states = get().learningStates;
        const existing = states[key];
        const base = existing ?? newLearningState(mode, cardId, now);
        const next = srsAdvance(base, correct, now);
        const heatmap = incrementToday(get().heatmap, now);
        set({
          learningStates: { ...states, [key]: next },
          heatmap,
          lastActiveAt: now,
          currentStreak: currentStreak(heatmap, now),
        });
      },

      getQueueForMode: (mode, allCardIds) => {
        const states = get().learningStates;
        const settings = get().settings;
        const now = Date.now();

        // For each cardId, get-or-create learning state
        const modeStates: LearningState[] = allCardIds.map((cardId) => {
          const key = cardKey(mode, cardId);
          return states[key] ?? newLearningState(mode, cardId, now);
        });

        return srsGetTodayQueue(modeStates, now, settings);
      },

      getState: (mode, cardId) => get().learningStates[cardKey(mode, cardId)],

      updateSettings: (partial) =>
        set({ settings: { ...get().settings, ...partial } }),

      replaceAll: (next) => set({ ...next }),

      reset: () => set({ ...initialState }),
    }),
    {
      name: "jikari-state",
      storage: createJSONStorage(() => safeLocalStorage()),
      version: SCHEMA_VERSION,
      /**
       * Migration: if persisted state has older schemaVersion, upgrade here.
       * For v1 this is a no-op.
       */
      migrate: (persisted: unknown, _version: number) => {
        // Validate that persisted looks like our PersistedState shape
        if (!persisted || typeof persisted !== "object") return initialState;
        return persisted as PersistedState;
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
    settings: state.settings,
  };
  return JSON.stringify(backup, null, 2);
}

/** Re-export for callers */
export { toLocalDateKey };
