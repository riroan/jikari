/**
 * jikari data types
 * Source: DESIGN.md § Component vocabulary + CEO plan accepted scope
 */

export type JLPTLevel = 5 | 4 | 3 | 2 | 1;

export interface KanjiCard {
  id: string;
  kanji: string;
  onReadings: string[];
  kunReadings: string[];
  meanings: string[];
  jlptLevel: JLPTLevel;
  /** Korean hanja (usually same char, sometimes traditional variant) */
  koreanHanja: string;
  /** 음 — Korean sound readings */
  koreanSound: string[];
  /** 뜻 — Korean traditional meaning */
  koreanMeaning: string;
}

export interface VocabCard {
  id: string;
  word: string;
  reading: string;
  /** English meanings (reference only, shown on card back) */
  meanings: string[];
  /** Korean meanings — primary quiz choice language for Korean speakers */
  koreanMeanings: string[];
  jlptLevel: JLPTLevel;
}

export interface SentenceCard {
  id: string;
  /** Sentence with ＿＿＿ blank */
  sentence: string;
  /** The correct word that fills the blank */
  blank: string;
  /** 3 semantically-distinct distractors (not just grammatically valid) */
  distractors: string[];
  translation: string;
  jlptLevel: JLPTLevel;
}

export type CardMode = "kanji" | "vocab" | "sentence";
export type Card = KanjiCard | VocabCard | SentenceCard;

export interface LearningState {
  /** Composite key: `${mode}:${cardId}` */
  cardKey: string;
  mode: CardMode;
  cardId: string;
  /** Leitner box: 1 (daily) → 5 (biweekly) */
  box: 1 | 2 | 3 | 4 | 5;
  /** Unix ms when card is next due */
  nextDue: number;
  correctStreak: number;
  /** Unix ms of last review */
  lastReviewed: number;
}

/** Daily heatmap data — key is YYYY-MM-DD (browser local timezone) */
export type HeatmapData = Record<string, number>;

/** Root persisted state — bump schemaVersion on breaking change */
export interface PersistedState {
  schemaVersion: number;
  learningStates: Record<string, LearningState>;
  heatmap: HeatmapData;
  /** Unix ms of last activity, for streak calc */
  lastActiveAt: number;
  /** Consecutive days of activity */
  currentStreak: number;
  /** User settings */
  settings: {
    theme: "light" | "dark";
    /** Max new cards to introduce per day (outside voice catch) */
    dailyNewLimit: number;
    /** Max review cards per day */
    dailyReviewLimit: number;
  };
}

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: PersistedState["settings"] = {
  theme: "light",
  dailyNewLimit: 20,
  dailyReviewLimit: 50,
};
