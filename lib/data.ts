import type { KanjiCard, SentenceCard, VocabCard } from "./types";

import kanjiData from "../public/data/kanji-n5-n4.json";
import vocabData from "../public/data/vocab-n5-n4.json";
import sentenceData from "../public/data/sentences.json";

/** All N5-N4 kanji cards. */
export const KANJI_CARDS: KanjiCard[] = kanjiData.cards as KanjiCard[];

/** All N5-N4 vocab cards. */
export const VOCAB_CARDS: VocabCard[] = vocabData.cards as VocabCard[];

/** All fill-in-blank sentence cards. */
export const SENTENCE_CARDS: SentenceCard[] = sentenceData.cards as SentenceCard[];

export const KANJI_IDS = KANJI_CARDS.map((c) => c.id);
export const VOCAB_IDS = VOCAB_CARDS.map((c) => c.id);
export const SENTENCE_IDS = SENTENCE_CARDS.map((c) => c.id);

const KANJI_BY_ID = new Map(KANJI_CARDS.map((c) => [c.id, c]));
const VOCAB_BY_ID = new Map(VOCAB_CARDS.map((c) => [c.id, c]));
const SENTENCE_BY_ID = new Map(SENTENCE_CARDS.map((c) => [c.id, c]));

export function getKanji(id: string): KanjiCard | undefined {
  return KANJI_BY_ID.get(id);
}
export function getVocab(id: string): VocabCard | undefined {
  return VOCAB_BY_ID.get(id);
}
export function getSentence(id: string): SentenceCard | undefined {
  return SENTENCE_BY_ID.get(id);
}

/**
 * Generate 4-choice options for a kanji card — correct reading + 3 distractors
 * sampled from other kanji's readings. Deterministic with a seed for test stability.
 */
export function generateKanjiChoices(
  card: KanjiCard,
  questionType: "on" | "kun",
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correctReadings = questionType === "on" ? card.onReadings : card.kunReadings;
  if (correctReadings.length === 0) {
    // Fall back to the other reading type if this one is empty
    const fallback = questionType === "on" ? card.kunReadings : card.onReadings;
    if (fallback.length === 0) {
      return { correct: "?", choices: ["?", "?", "?", "?"] };
    }
    return generateKanjiChoices(card, questionType === "on" ? "kun" : "on", seed);
  }
  const correct = correctReadings[0];

  // Sample distractors from other cards' same-type readings
  const pool: string[] = [];
  for (const other of KANJI_CARDS) {
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
 * Generate 4-choice options for a vocab card — correct meaning + 3 distractors.
 */
export function generateVocabChoices(
  card: VocabCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.meanings[0];
  const pool: string[] = [];
  for (const other of VOCAB_CARDS) {
    if (other.id === card.id) continue;
    for (const m of other.meanings) {
      if (!card.meanings.includes(m)) pool.push(m);
    }
  }
  const distractors = sampleUnique(pool, 3, seed);
  const choices = shuffle([correct, ...distractors], seed + 1);
  return { correct, choices };
}

/**
 * Sentence card choices come pre-authored (distractors are semantically curated).
 * We just shuffle the 4 options.
 */
export function generateSentenceChoices(
  card: SentenceCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.blank;
  return { correct, choices: shuffle([correct, ...card.distractors], seed) };
}

// ─────────────────────────────────────────────────────────────
// Deterministic sampling helpers (seed-based for test stability)
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

/** Pick a random card from an array, respecting seed for tests. */
export function pickRandom<T>(arr: T[], seed: number = Math.random()): T | undefined {
  if (arr.length === 0) return undefined;
  const s = (seed * 9301 + 49297) % 233280;
  return arr[Math.floor((s / 233280) * arr.length)];
}
