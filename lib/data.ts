import type {
  ExpressionCard,
  GrammarCard,
  GrammarPatternCard,
  GrammarPatternQuiz,
  KanjiCard,
  ParticleContrastCard,
  ParticleContrastQuiz,
  SentenceCard,
  VocabCard,
} from "./types";
import { useCardsStore } from "./cards-store";

export type QuizDirection = "recall" | "recognition";

function cards() {
  return useCardsStore.getState();
}

export function getKanji(id: string): KanjiCard | undefined {
  return cards().kanjiById.get(id);
}

export function getVocab(id: string): VocabCard | undefined {
  return cards().vocabById.get(id);
}

export function getSentence(id: string): SentenceCard | undefined {
  return cards().sentenceById.get(id);
}

export function getGrammar(id: string): GrammarCard | undefined {
  return cards().grammarById.get(id);
}

export function getExpression(id: string): ExpressionCard | undefined {
  return cards().expressionById.get(id);
}

export function getGrammarPattern(id: string): GrammarPatternCard | undefined {
  const c = cards().grammarById.get(id);
  return c?.type === "pattern" ? c : undefined;
}

export function getGrammarParticleContrast(
  id: string,
): ParticleContrastCard | undefined {
  const c = cards().grammarById.get(id);
  return c?.type === "particle_contrast" ? c : undefined;
}

/**
 * Look up ruby markup for a word. Tries:
 *   1. Exact match on word (食べる → "{食|た}べる")
 *   2. Conjugation match — trim common Japanese verb suffixes and retry
 *      (飲んだ → 飲む → "{飲|の}む")
 *   3. Fall back to the word as-is (no ruby).
 */
export function wordToRuby(word: string): string {
  const byWord = cards().vocabByWord;

  const direct = byWord.get(word);
  if (direct?.ruby) return direct.ruby;
  if (direct) return word;

  const conjugations: Array<[RegExp, string]> = [
    [/んだ$/, "む"],
    [/いた$/, "く"],
    [/った$/, "る"],
    [/ました$/, "る"],
    [/って$/, "る"],
    [/て$/, "る"],
    [/た$/, "る"],
  ];
  for (const [suffixPattern, replacement] of conjugations) {
    if (!suffixPattern.test(word)) continue;
    const dictForm = word.replace(suffixPattern, replacement);
    const candidate = byWord.get(dictForm);
    if (candidate?.ruby) {
      const dictSuffix = replacement;
      const conjSuffix = word.slice(dictForm.length - dictSuffix.length);
      return candidate.ruby.slice(0, candidate.ruby.length - dictSuffix.length) + conjSuffix;
    }
  }

  for (const [suffixPattern, replacement] of [
    [/った$/, "う"],
    [/って$/, "う"],
  ] as const) {
    if (!suffixPattern.test(word)) continue;
    const dictForm = word.replace(suffixPattern, replacement);
    const candidate = byWord.get(dictForm);
    if (candidate?.ruby) {
      const conjSuffix = word.slice(dictForm.length - replacement.length);
      return (
        candidate.ruby.slice(0, candidate.ruby.length - replacement.length) + conjSuffix
      );
    }
  }

  return word;
}

export function generateKanjiChoices(
  card: KanjiCard,
  questionType: "on" | "kun",
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correctReadings = questionType === "on" ? card.onReadings : card.kunReadings;
  if (correctReadings.length === 0) {
    const fallback = questionType === "on" ? card.kunReadings : card.onReadings;
    if (fallback.length === 0) {
      return { correct: "?", choices: ["?", "?", "?", "?"] };
    }
    return generateKanjiChoices(card, questionType === "on" ? "kun" : "on", seed);
  }
  const correct = correctReadings[0];

  const all = cards().kanji;
  const pool: string[] = [];
  for (const other of all) {
    if (other.id === card.id) continue;
    const otherReadings = questionType === "on" ? other.onReadings : other.kunReadings;
    for (const r of otherReadings) {
      if (r && r !== correct && !correctReadings.includes(r)) {
        pool.push(r);
      }
    }
  }

  const distractors = sampleUnique(pool, 3, seed);
  const choices = shuffle([correct, ...distractors], seed + 1);
  return { correct, choices };
}

/**
 * 4-choice builder for 単語.
 *   recognition → question = JP word, choices = 한국어 뜻
 *   recall      → question = 한국어 뜻, choices = JP word (ruby 있으면 ruby 문자열)
 */
export function generateVocabChoices(
  card: VocabCard,
  direction: QuizDirection,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const all = cards().vocab;
  const others = all.filter((v) => v.id !== card.id);

  if (direction === "recall") {
    const correct = card.ruby ?? card.word;
    const pool = others
      .map((v) => v.ruby ?? v.word)
      .filter((w) => w !== correct);
    const distractors = sampleUnique(pool, 3, seed);
    return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
  }

  const correct = card.koreanMeanings[0];
  const pool: string[] = [];
  for (const other of others) {
    for (const m of other.koreanMeanings) {
      if (!card.koreanMeanings.includes(m)) pool.push(m);
    }
  }
  const distractors = sampleUnique(pool, 3, seed);
  return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
}

/**
 * Shared 4-choice builder. Shuffles `[correct, ...distractors]` with a
 * stable seed and returns the same `{ correct, choices }` shape every
 * quiz-flavored mode uses.
 */
export function generateChoices(
  correct: string,
  distractors: string[],
  seed: number = Math.random(),
): { correct: string; choices: string[] } {
  return { correct, choices: shuffle([correct, ...distractors], seed) };
}

export function generateSentenceChoices(
  card: SentenceCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.blankRuby ?? wordToRuby(card.blank);
  const distractorsRuby = card.distractors.map(wordToRuby);
  return generateChoices(correct, distractorsRuby, seed);
}

/**
 * Deterministic 32-bit-ish hash of (id, epoch) for direction toggling.
 * Used only for display/UX branching — not cryptographic.
 */
export function hashSeed(id: string, epoch: number): number {
  let h = 2166136261 ^ epoch;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Direction toggle for 일상표현 퀴즈 — recall-first 80/20 (post /plan-eng-review).
 *   box ≤ 1 → `recognition` (warm-up for new cards, 진입 장벽 완화)
 *   box ≥ 2 → 80% recall / 20% recognition, hash-stable within an epoch
 *
 * This subject's unique value is 상황 → 표현 recall. 50/50 would halve that.
 */
export function chooseDirection(
  box: 1 | 2 | 3 | 4 | 5,
  id: string,
  epoch: number,
): QuizDirection {
  if (box <= 1) return "recognition";
  return hashSeed(id, epoch) % 10 < 8 ? "recall" : "recognition";
}

/**
 * 4-choice builder for 일상표현.
 *   recall      → question = situation_ko, choices = expression_jp (ruby 포함)
 *   recognition → question = expression_jp, choices = translation_ko (한국어)
 * Distractor pool is the entire deck minus the correct card (v1 simplification
 * per /plan-eng-review — same-register 규칙은 seed 50+에서 재도입).
 */
export function generateExpressionChoices(
  card: ExpressionCard,
  direction: QuizDirection,
  seed: number = Math.random(),
): { correct: string; choices: string[] } {
  const all = cards().expressions;
  const others = all.filter((e) => e.id !== card.id);

  if (direction === "recall") {
    const correct = card.ruby ?? card.expression_jp;
    const pool = others.map((e) => e.ruby ?? e.expression_jp);
    const distractors = sampleUnique(pool, 3, seed);
    return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
  }

  // recognition
  const correct = card.translation_ko;
  const pool = others
    .map((e) => e.translation_ko)
    .filter((t) => t !== correct);
  const distractors = sampleUnique(pool, 3, seed);
  return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
}

/**
 * Grammar quiz 4-choice — both pattern and particle_contrast quiz shapes
 * already carry `correct` + `distractors: string[]`, so this is a thin
 * wrapper over `generateChoices`. Exported as a named function so grammar
 * callsites don't poke the generic helper directly.
 */
export function generateGrammarQuizChoices(
  quiz: GrammarPatternQuiz | ParticleContrastQuiz,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  return generateChoices(quiz.correct, quiz.distractors, seed);
}

// ─────────────────────────────────────────────────────────────
// Pure helpers (seed-based for test stability)
// ─────────────────────────────────────────────────────────────

function sampleUnique<T>(pool: T[], n: number, seed: number): T[] {
  const uniquePool = Array.from(new Set(pool));
  const shuffled = shuffle(uniquePool, seed);
  return shuffled.slice(0, n);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const j = Math.floor(r * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandom<T>(arr: T[], seed: number = Math.random()): T | undefined {
  if (arr.length === 0) return undefined;
  const s = (seed * 9301 + 49297) % 233280;
  return arr[Math.floor((s / 233280) * arr.length)];
}
