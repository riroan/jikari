import { describe, it, expect, beforeEach } from "vitest";
import { useStore, exportState } from "@/lib/store";
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from "@/lib/types";
import { INITIAL_RATING } from "@/lib/rating";
import type { PersistedState } from "@/lib/types";

const fresh = (): PersistedState => ({
  schemaVersion: SCHEMA_VERSION,
  learningStates: {},
  heatmap: {},
  lastActiveAt: 0,
  currentStreak: 0,
  quizStats: {},
  ratings: {},
  settings: { ...DEFAULT_SETTINGS },
});

beforeEach(() => {
  // reset() preserves the action methods that setState(_, true) would wipe.
  useStore.getState().reset();
});

describe("store.review", () => {
  it("creates a new LearningState the first time a card is reviewed", () => {
    const before = useStore.getState().learningStates;
    expect(Object.keys(before)).toHaveLength(0);

    useStore.getState().review("kanji", "k-1", true);

    const states = useStore.getState().learningStates;
    expect(Object.keys(states)).toHaveLength(1);
    expect(states["kanji:k-1"]).toBeDefined();
    expect(states["kanji:k-1"].lastReviewed).toBeGreaterThan(0);
  });

  it("advances the box on a correct answer", () => {
    useStore.getState().review("vocab", "v-1", true);
    const box1 = useStore.getState().learningStates["vocab:v-1"].box;

    useStore.getState().review("vocab", "v-1", true);
    const box2 = useStore.getState().learningStates["vocab:v-1"].box;

    expect(box2).toBeGreaterThan(box1);
  });

  it("updates heatmap + lastActiveAt + currentStreak on review", () => {
    useStore.getState().review("kanji", "k-1", true);
    const s = useStore.getState();
    expect(s.lastActiveAt).toBeGreaterThan(0);
    expect(Object.keys(s.heatmap)).toHaveLength(1);
    expect(s.currentStreak).toBeGreaterThanOrEqual(1);
  });
});

describe("store.recordQuizResult", () => {
  it("starts both correct + wrong at 0 for an unseen key", () => {
    useStore.getState().recordQuizResult("kanji", true);
    expect(useStore.getState().quizStats.kanji).toEqual({ correct: 1, wrong: 0 });
  });

  it("accumulates correct + wrong independently", () => {
    useStore.getState().recordQuizResult("vocab", true);
    useStore.getState().recordQuizResult("vocab", true);
    useStore.getState().recordQuizResult("vocab", false);
    expect(useStore.getState().quizStats.vocab).toEqual({ correct: 2, wrong: 1 });
  });
});

describe("store.getBox / store.getState", () => {
  it("returns 1 for an unseen card (default Leitner box)", () => {
    expect(useStore.getState().getBox("kanji", "ghost")).toBe(1);
    expect(useStore.getState().getState("kanji", "ghost")).toBeUndefined();
  });

  it("reflects the actual box after review", () => {
    useStore.getState().review("kanji", "k-1", true);
    expect(useStore.getState().getBox("kanji", "k-1")).toBeGreaterThanOrEqual(1);
    expect(useStore.getState().getState("kanji", "k-1")).toBeDefined();
  });
});

describe("store.updateSettings", () => {
  it("merges partial updates without clobbering other fields", () => {
    useStore.getState().updateSettings({ theme: "dark" });
    const s = useStore.getState().settings;
    expect(s.theme).toBe("dark");
    // showFurigana keeps its default
    expect(s.showFurigana).toBe(DEFAULT_SETTINGS.showFurigana);
  });
});

describe("store.replaceAll / store.reset", () => {
  it("replaceAll swaps the entire persisted slice", () => {
    const replacement: PersistedState = {
      ...fresh(),
      currentStreak: 7,
      quizStats: { kanji: { correct: 3, wrong: 1 } },
    };
    useStore.getState().replaceAll(replacement);
    expect(useStore.getState().currentStreak).toBe(7);
    expect(useStore.getState().quizStats.kanji).toEqual({ correct: 3, wrong: 1 });
  });

  it("reset wipes back to initial state", () => {
    useStore.getState().review("kanji", "k-1", true);
    useStore.getState().recordQuizResult("kanji", true);
    expect(Object.keys(useStore.getState().learningStates).length).toBeGreaterThan(0);

    useStore.getState().reset();
    expect(useStore.getState().learningStates).toEqual({});
    expect(useStore.getState().quizStats).toEqual({});
    expect(useStore.getState().currentStreak).toBe(0);
  });
});

describe("store.review adaptive rating", () => {
  it("leaves ratings untouched when no difficulty is supplied", () => {
    useStore.getState().review("kanji", "k-1", true);
    expect(useStore.getState().ratings).toEqual({});
  });

  it("raises the mode rating on a correct answer, lowers it on a wrong one", () => {
    useStore.getState().review("kanji", "k-1", true, "choice", 1500);
    const up = useStore.getState().ratings.kanji;
    expect(up).toBeGreaterThan(INITIAL_RATING);

    useStore.getState().review("kanji", "k-2", false, "choice", 1500);
    expect(useStore.getState().ratings.kanji).toBeLessThan(up);
  });

  it("keeps a rating per mode rather than one global score", () => {
    useStore.getState().review("kanji", "k-1", true, "choice", 1500);
    useStore.getState().review("grammar", "g-1", false, "choice", 1500);

    const { kanji, grammar } = useStore.getState().ratings;
    expect(kanji).toBeGreaterThan(INITIAL_RATING);
    expect(grammar).toBeLessThan(INITIAL_RATING);
  });
});

describe("exportState", () => {
  it("serializes the persistable slice as parseable JSON", () => {
    useStore.getState().review("kanji", "k-1", true);
    const json = exportState();
    const parsed = JSON.parse(json) as PersistedState;
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.learningStates["kanji:k-1"]).toBeDefined();
  });

  it("does not include any of the action functions in the snapshot", () => {
    const parsed = JSON.parse(exportState()) as Record<string, unknown>;
    expect(parsed.review).toBeUndefined();
    expect(parsed.reset).toBeUndefined();
    expect(parsed.updateSettings).toBeUndefined();
  });
});
