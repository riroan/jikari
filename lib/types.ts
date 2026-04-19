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

/**
 * Grammar mode cards (문법 모드) — 문형 + 조사 대조.
 * See design: ~/.gstack/projects/jikari/riroan-main-design-20260418-235448.md
 *
 * Data layout: one `grammar_cards` row per card, with a `type` discriminator
 * and JSON payload. Two variants share an id namespace but render differently.
 *
 * Example/quiz strings may carry inline markup (see lib/jp-markup.ts):
 *   {漢字|かんじ}    furigana ruby
 *   [[〜なければ]]   pattern highlight
 */
export type GrammarCardType = "pattern" | "particle_contrast";

export interface GrammarExample {
  /** Japanese sentence with optional {kanji|kana} ruby markup */
  jp: string;
  /** Korean translation */
  ko: string;
}

export interface GrammarPatternQuiz {
  /** Japanese sentence with a ＿＿＿ blank */
  sentence: string;
  /** Optional ruby-marked version of `sentence` */
  sentenceRuby?: string;
  /** The correct fill-in for the blank (may carry [[...]] highlight markup) */
  correct: string;
  /** 3 semantically-distinct distractors */
  distractors: string[];
  /** Korean translation of the full sentence */
  translation: string;
}

/**
 * 문형 카드 — 一つの grammar pattern + 한국어 구조 매핑 + 예문 3 + 빈칸 퀴즈 3.
 */
export interface GrammarPatternCard {
  id: string;
  type: "pattern";
  /** e.g., "〜なければならない" */
  pattern: string;
  /** Korean structural equivalent, e.g., "〜지 않으면 안 된다 / 〜해야 한다" */
  koreanStructure: string;
  /** One-line Korean meaning for card-front display */
  meaningKo: string;
  /** 3 example sentences (may contain {ruby} and [[highlight]]) */
  examples: GrammarExample[];
  /** 3 blank-fill quizzes */
  quizzes: GrammarPatternQuiz[];
  jlptLevel: JLPTLevel;
}

export interface ParticleContrastExample {
  /** Which particle this example illustrates */
  particle: string;
  /** Japanese sentence with optional ruby markup */
  jp: string;
  /** Korean translation */
  ko: string;
}

export interface ParticleContrastQuiz {
  sentence: string;
  sentenceRuby?: string;
  /** The correct particle (one of `particles`) */
  correct: string;
  /**
   * 3 distractors — may be the other particle from the same pair AND two
   * particles borrowed from other pairs (per eng review 2026-04-19 #7:
   * 4지선다 to avoid coin-flip memorization of 2-choice).
   */
  distractors: string[];
  translation: string;
}

/**
 * 조사 대조 카드 — 하나의 particle pair + 한국어 규칙 + 예문 2쌍(각 particle당 2) + 빈칸 퀴즈 3.
 */
export interface ParticleContrastCard {
  id: string;
  type: "particle_contrast";
  /** Exactly two particles being contrasted, e.g., ["は","が"] */
  particles: [string, string];
  /** One-line Korean rule that distinguishes them */
  rule: string;
  /** 4 examples total — 2 per particle */
  examples: ParticleContrastExample[];
  /** 3 blank quizzes */
  quizzes: ParticleContrastQuiz[];
  jlptLevel: JLPTLevel;
}

export type GrammarCard = GrammarPatternCard | ParticleContrastCard;

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
  | "adjective"
  | "grammar";
export type Card = KanjiCard | VocabCard | SentenceCard | GrammarCard;

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

/**
 * Cumulative per-page quiz tallies (lifetime, not session).
 * Key is a page identifier — kept separate from CardMode because pages and SRS
 * modes don't always align (e.g., particle page logs reviews under 'sentence').
 */
export type QuizStatKey =
  | "kanji"
  | "vocab"
  | "sentence"
  | "particle"
  | "grammar"
  | "conjugation"
  | "adjective";

export interface QuizStat {
  correct: number;
  wrong: number;
}

/** Root persisted state — bump schemaVersion on breaking change */
export interface PersistedState {
  schemaVersion: number;
  learningStates: Record<string, LearningState>;
  heatmap: HeatmapData;
  /** Unix ms of last activity, for streak calc */
  lastActiveAt: number;
  /** Consecutive days of activity */
  currentStreak: number;
  /** Lifetime ◯/✕ tallies per page */
  quizStats: Record<string, QuizStat>;
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

export const SCHEMA_VERSION = 5;

export const DEFAULT_SETTINGS: PersistedState["settings"] = {
  theme: "light",
  showFurigana: true,
  typingThresholdBox: 4,
};
