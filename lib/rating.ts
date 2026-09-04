import type { AdjectiveForm, ConjugationForm, JLPTLevel, Register } from "./types";

/**
 * Elo-style adaptive difficulty — the *user* is rated, items are not.
 *
 * θ (user rating) and d (item difficulty) share one scale where 1000 = JLPT N5
 * and 2000 = N1. After each answer θ moves by `K * (score - expected)`:
 * clearing an item far above θ moves it a lot, clearing one far below barely
 * moves it at all. A new user starts at {@link INITIAL_RATING} (= N5), so
 * "easy questions first" falls out of the cold start rather than a special case.
 *
 * Only θ is learned. Item difficulty is *derived* from data the cards already
 * carry (JLPT level; conjugation form later) and never fitted — this is a
 * single-user app, so one person's answers can never calibrate 652 items.
 * See lib/deck.ts for how θ feeds question selection.
 */

/** New user starts at the N5 band — the easy end. */
export const INITIAL_RATING = 1000;

/**
 * Floor exists to stop a death spiral: below the easiest item's difficulty
 * every wrong answer still drags θ down, with nothing easier left to serve.
 * The ceiling is cosmetic — θ self-limits above 2000 because the expected
 * score against the hardest item approaches 1.
 */
export const RATING_MIN = 800;
export const RATING_MAX = 2200;

/**
 * ponytail: K=24 / SCALE=400 are chess defaults, not tuned on real data.
 * K is the tuning knob — raise it if θ tracks improvement too slowly,
 * lower it if a couple of unlucky answers swing the served difficulty.
 */
const K = 24;
const SCALE = 400;

/** Difficulty per JLPT level. N5 (easiest) = 1000 … N1 = 2000. */
const JLPT_DIFFICULTY: Record<JLPTLevel, number> = {
  5: 1000,
  4: 1250,
  3: 1500,
  2: 1750,
  1: 2000,
};

/** Fallback for cards carrying no difficulty signal (e.g. ExpressionCard). */
export const DEFAULT_DIFFICULTY = JLPT_DIFFICULTY[4];

export function difficultyOfJlpt(level: JLPTLevel): number {
  return JLPT_DIFFICULTY[level];
}

/**
 * Difficulty for any card carrying a JLPT level. Takes the card (possibly
 * undefined) rather than the level so deck callers can pipe a Map lookup
 * straight in — a missing card falls back instead of throwing.
 */
export function jlptDifficulty(
  card: { jlptLevel: JLPTLevel } | undefined,
): number {
  return card ? JLPT_DIFFICULTY[card.jlptLevel] : DEFAULT_DIFFICULTY;
}

/**
 * 활용형 난이도. 単語의 JLPT 레벨과는 다른 축이다 — 食べる(N5)의 使役형이
 * 影響(N2)의 ます형보다 훨씬 어렵다. 그러니 활용 퀴즈에서 난이도를 지는 것은
 * 카드가 아니라 *형*이고, 여기 숫자는 JLPT 스케일에 얹은 근사치다.
 *
 * ponytail: 세 덩어리(기본 / 중급 / 고급)를 나눈 것뿐, 형끼리의 미세한 순서는
 * 눈대중이다. 실제 정답률이 쌓이면 그때 흔들면 된다.
 */
const CONJUGATION_FORM_DIFFICULTY: Record<ConjugationForm, number> = {
  masu: 1000,
  ta: 1050,
  te: 1100,
  nai: 1100,
  conditional: 1350,
  potential: 1400,
  volitional: 1450,
  imperative: 1600,
  passive: 1700,
  causative: 1750,
};

export function conjugationFormDifficulty(form: ConjugationForm): number {
  return CONJUGATION_FORM_DIFFICULTY[form];
}

/** 형용사도 같은 축 — 부정·과거가 쉽고 조건형·정중부정이 어렵다. */
const ADJECTIVE_FORM_DIFFICULTY: Record<AdjectiveForm, number> = {
  negative: 1000,
  past: 1050,
  na_prenominal: 1100,
  past_negative: 1150,
  i_adv: 1200,
  ni_adv: 1200,
  te: 1250,
  polite_negative: 1300,
  conditional: 1450,
};

export function adjectiveFormDifficulty(form: AdjectiveForm): number {
  return ADJECTIVE_FORM_DIFFICULTY[form];
}

/**
 * ExpressionCard carries no JLPT level, so politeness stands in for it:
 * 겸양어 is genuinely the hard end of everyday speech.
 */
const REGISTER_DIFFICULTY: Record<Register, number> = {
  casual: 1100,
  polite: 1300,
  humble: 1700,
};

export function registerDifficulty(
  card: { register: Register } | undefined,
): number {
  return card ? REGISTER_DIFFICULTY[card.register] : DEFAULT_DIFFICULTY;
}

/**
 * JLPT band a rating currently sits in — the label shown on /progress.
 * Nearest band rather than "highest cleared", so the number and the label
 * always agree about which end of the scale the user is on.
 */
export function ratingBand(rating: number): JLPTLevel {
  let best: JLPTLevel = 5;
  for (const level of [5, 4, 3, 2, 1] as const) {
    if (
      Math.abs(JLPT_DIFFICULTY[level] - rating) <
      Math.abs(JLPT_DIFFICULTY[best] - rating)
    ) {
      best = level;
    }
  }
  return best;
}

/**
 * Rating rounded to a 50-point step. Feeding the *quantized* value to the deck
 * — and using it as the memo dependency — means a deck is re-sampled only once
 * the rating has genuinely moved (~4 answers at K=24), instead of reshuffling
 * under the user on every single answer. 50 points is well inside the deck's
 * BAND_WIDTH, so the rounding costs no selection accuracy.
 */
export function quantizeRating(rating: number): number {
  return Math.round(rating / 50) * 50;
}

/** Probability of answering an item of difficulty `d` correctly at rating `θ`. */
export function expectedScore(rating: number, difficulty: number): number {
  return 1 / (1 + 10 ** ((difficulty - rating) / SCALE));
}

/** θ after one answer, clamped to [RATING_MIN, RATING_MAX]. */
export function updateRating(
  rating: number,
  difficulty: number,
  correct: boolean,
): number {
  const score = correct ? 1 : 0;
  const next = rating + K * (score - expectedScore(rating, difficulty));
  return Math.min(RATING_MAX, Math.max(RATING_MIN, next));
}
