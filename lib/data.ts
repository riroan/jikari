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
// Word → ruby lookup for auto-annotating sentence distractors.
// Key by both dictionary form and (plain kanji+okurigana) so conjugated forms
// like "飲んだ" resolve via the dictionary form "飲む".
const VOCAB_BY_WORD = new Map(VOCAB_CARDS.map((c) => [c.word, c]));

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
 * Look up ruby markup for a word. Tries:
 *   1. Exact match on word (食べる → "{食|た}べる")
 *   2. Conjugation match — trim common Japanese verb suffixes and retry
 *      (飲んだ → 飲む → "{飲|の}む")
 *      In that case we substitute the suffix back onto the kanji portion.
 *   3. Fall back to the word as-is (no ruby).
 *
 * This is a heuristic — good enough for seed data where distractors are
 * common N5 verbs. For broader coverage, integrate kuromoji.js.
 */
export function wordToRuby(word: string): string {
  // Direct match
  const direct = VOCAB_BY_WORD.get(word);
  if (direct?.ruby) return direct.ruby;
  if (direct) return word; // known word, no ruby (kana)

  // Try conjugation stripping for common past/te/masu forms
  // 飲んだ → 飲む, 書いた → 書く, 食べた → 食べる, etc.
  const conjugations: Array<[RegExp, string]> = [
    // past て form: た → dictionary final
    [/んだ$/, "む"], // 飲んだ → 飲む
    [/いた$/, "く"], // 書いた → 書く
    [/った$/, "る"], // 買った → 買う  — but also 走った → 走る. Ambiguous. Retry both.
    [/ました$/, "る"], // 食べました → 食べる (crude)
    [/って$/, "る"], // 買って → 買う — handled below by u/ru fallback
    [/て$/, "る"], // 食べて → 食べる
    [/た$/, "る"], // 食べた → 食べる
  ];
  for (const [suffixPattern, replacement] of conjugations) {
    if (!suffixPattern.test(word)) continue;
    const dictForm = word.replace(suffixPattern, replacement);
    const candidate = VOCAB_BY_WORD.get(dictForm);
    if (candidate?.ruby) {
      // Swap the suffix back into the matched ruby markup
      const dictSuffix = replacement;
      const conjSuffix = word.slice(dictForm.length - dictSuffix.length);
      return candidate.ruby.slice(0, candidate.ruby.length - dictSuffix.length) + conjSuffix;
    }
  }

  // u-verb variant: try -う → -った, -う → -って
  for (const [suffixPattern, replacement] of [
    [/った$/, "う"], // 買った → 買う
    [/って$/, "う"], // 買って → 買う
  ] as const) {
    if (!suffixPattern.test(word)) continue;
    const dictForm = word.replace(suffixPattern, replacement);
    const candidate = VOCAB_BY_WORD.get(dictForm);
    if (candidate?.ruby) {
      const conjSuffix = word.slice(dictForm.length - replacement.length);
      return (
        candidate.ruby.slice(0, candidate.ruby.length - replacement.length) + conjSuffix
      );
    }
  }

  // No match — return plain
  return word;
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
 * Generate 4-choice options for a vocab card — correct Korean meaning + 3 distractors.
 * Korean is primary quiz language for Korean speakers (design review feedback).
 */
export function generateVocabChoices(
  card: VocabCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.koreanMeanings[0];
  const pool: string[] = [];
  for (const other of VOCAB_CARDS) {
    if (other.id === card.id) continue;
    for (const m of other.koreanMeanings) {
      if (!card.koreanMeanings.includes(m)) pool.push(m);
    }
  }
  const distractors = sampleUnique(pool, 3, seed);
  const choices = shuffle([correct, ...distractors], seed + 1);
  return { correct, choices };
}

/**
 * Sentence card choices come pre-authored (distractors are semantically curated).
 * We shuffle the 4 options and auto-annotate each with ruby markup via
 * VOCAB lookup so all kanji in choices also show furigana (when enabled).
 *
 * Returns ruby-markup strings. If furigana is disabled by the user's setting,
 * the RubyText component strips the markup at render time.
 */
export function generateSentenceChoices(
  card: SentenceCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.blankRuby ?? wordToRuby(card.blank);
  const distractorsRuby = card.distractors.map(wordToRuby);
  return { correct, choices: shuffle([correct, ...distractorsRuby], seed) };
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
