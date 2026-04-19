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

/**
 * Verb group for conjugation. Non-verbs use 'not_verb' so the pool query can
 * filter on `verb_group IN ('godan','ichidan','irregular')` without nulls.
 * Unset = not yet classified.
 */
export type VerbGroup = "godan" | "ichidan" | "irregular" | "not_verb";

/**
 * Adjective group. Orthogonal to VerbGroup — a VocabCard classified as a verb
 * will have adj_group = 'not_adj' (and vice versa). Unset = not yet classified.
 */
export type AdjGroup = "i_adj" | "na_adj" | "not_adj";

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
  /** Verb group for conjugation quiz — undefined until backfilled. */
  verbGroup?: VerbGroup;
  /** Adjective group for adjective-conjugation quiz — undefined until backfilled. */
  adjGroup?: AdjGroup;
}

/**
 * Japanese verb conjugation forms supported by the conjugation quiz.
 *
 * Basic 4 (SRS 동사-단위 샘플링):
 *   masu / te / ta / nai
 * Intermediate+advanced 6 (SRS 형-단위 per-form 독립):
 *   potential / volitional / imperative / causative / passive / conditional
 */
export type ConjugationForm =
  | "masu"
  | "te"
  | "ta"
  | "nai"
  | "potential"
  | "volitional"
  | "imperative"
  | "causative"
  | "passive"
  | "conditional";

export const BASIC_FORMS: readonly ConjugationForm[] = [
  "masu",
  "te",
  "ta",
  "nai",
];

export const ADVANCED_FORMS: readonly ConjugationForm[] = [
  "potential",
  "volitional",
  "imperative",
  "causative",
  "passive",
  "conditional",
];

export const ALL_CONJUGATION_FORMS: readonly ConjugationForm[] = [
  ...BASIC_FORMS,
  ...ADVANCED_FORMS,
];

/**
 * Japanese adjective conjugation forms supported by the adjective quiz.
 *
 * Common core (both い and な):
 *   negative / past / past_negative / te
 * Type-specific:
 *   i_adv (〜く)    — i-adj only (adverbial)
 *   na_prenominal (〜な) — na-adj only (noun modifier)
 *
 * Callers should filter by group — see ADJ_FORMS_FOR.
 */
export type AdjectiveForm =
  | "negative"
  | "past"
  | "past_negative"
  | "te"
  | "i_adv"
  | "na_prenominal";

export const COMMON_ADJ_FORMS: readonly AdjectiveForm[] = [
  "negative",
  "past",
  "past_negative",
  "te",
];

/**
 * Forms applicable to each adjective group. Used by page to filter form
 * sampling — an い-adj never gets na_prenominal, etc.
 */
export const ADJ_FORMS_FOR: Record<
  Exclude<AdjGroup, "not_adj">,
  readonly AdjectiveForm[]
> = {
  i_adj: [...COMMON_ADJ_FORMS, "i_adv"],
  na_adj: [...COMMON_ADJ_FORMS, "na_prenominal"],
};

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

export type CardMode =
  | "kanji"
  | "vocab"
  | "sentence"
  | "conjugation"
  | "adjective";
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
