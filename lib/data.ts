import type { KanjiCard, SentenceCard, VocabCard } from "./types";
import { useCardsStore } from "./cards-store";

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

export function generateVocabChoices(
  card: VocabCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.koreanMeanings[0];
  const all = cards().vocab;
  const pool: string[] = [];
  for (const other of all) {
    if (other.id === card.id) continue;
    for (const m of other.koreanMeanings) {
      if (!card.koreanMeanings.includes(m)) pool.push(m);
    }
  }
  const distractors = sampleUnique(pool, 3, seed);
  const choices = shuffle([correct, ...distractors], seed + 1);
  return { correct, choices };
}

export function generateSentenceChoices(
  card: SentenceCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.blankRuby ?? wordToRuby(card.blank);
  const distractorsRuby = card.distractors.map(wordToRuby);
  return { correct, choices: shuffle([correct, ...distractorsRuby], seed) };
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
