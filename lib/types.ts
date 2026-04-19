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
  /**
   * Optional word with inline furigana markup: `{漢字|かんじ}` segments.
   * Example: `{食|た}べる`. Falls back to `word + reading` if absent.
   */
  ruby?: string;
  jlptLevel: JLPTLevel;
}

export type SentenceCategory = "vocab" | "particle";

export interface SentenceCard {
  id: string;
  /** Which pool this card belongs to — default "vocab" (verbs/adjectives blanks). */
  category: SentenceCategory;
  /** Sentence with ＿＿＿ blank — plain text (no markup) */
  sentence: string;
  /**
   * Optional sentence with furigana markup: `{私|わたし}は{水|みず}を＿＿＿。`.
   * Rendered via RubyText. Falls back to `sentence` if absent.
   */
  sentenceRuby?: string;
  /** The correct word that fills the blank (may contain ruby markup) */
  blank: string;
  /** Optional ruby version of the blank — used when rendering filled-back */
  blankRuby?: string;
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
    /** Show furigana over kanji — beginners on, advanced off */
    showFurigana: boolean;
    /**
     * Leitner box at which the quiz switches from 4-choice to typing.
     * 2 = aggressive (starts typing early), 5 = conservative.
     * Default 4 — box 4 is active recall territory.
     */
    typingThresholdBox: 2 | 3 | 4 | 5;
  };
}

export const SCHEMA_VERSION = 4;

export const DEFAULT_SETTINGS: PersistedState["settings"] = {
  theme: "light",
  showFurigana: true,
  typingThresholdBox: 4,
};
