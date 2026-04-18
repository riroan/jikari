"use client";

import { create } from "zustand";
import type { KanjiCard, SentenceCard, VocabCard } from "./types";

interface CardsState {
  ready: boolean;
  error: string | null;
  kanji: KanjiCard[];
  vocab: VocabCard[];
  sentences: SentenceCard[];
  kanjiIds: string[];
  vocabIds: string[];
  /** IDs of sentence cards with category === "vocab" (verbs/adjectives blanks) */
  sentenceIds: string[];
  /** IDs of sentence cards with category === "particle" */
  particleIds: string[];
  kanjiById: Map<string, KanjiCard>;
  vocabById: Map<string, VocabCard>;
  sentenceById: Map<string, SentenceCard>;
  vocabByWord: Map<string, VocabCard>;
  hydrate: () => Promise<void>;
}

const emptyMaps = {
  kanji: [] as KanjiCard[],
  vocab: [] as VocabCard[],
  sentences: [] as SentenceCard[],
  kanjiIds: [] as string[],
  vocabIds: [] as string[],
  sentenceIds: [] as string[],
  particleIds: [] as string[],
  kanjiById: new Map<string, KanjiCard>(),
  vocabById: new Map<string, VocabCard>(),
  sentenceById: new Map<string, SentenceCard>(),
  vocabByWord: new Map<string, VocabCard>(),
};

export const useCardsStore = create<CardsState>((set, get) => ({
  ready: false,
  error: null,
  ...emptyMaps,

  hydrate: async () => {
    if (get().ready) return;
    try {
      const res = await fetch("/api/cards", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { kanji, vocab, sentences } = (await res.json()) as {
        kanji: KanjiCard[];
        vocab: VocabCard[];
        sentences: SentenceCard[];
      };
      set({
        ready: true,
        error: null,
        kanji,
        vocab,
        sentences,
        kanjiIds: kanji.map((c) => c.id),
        vocabIds: vocab.map((c) => c.id),
        sentenceIds: sentences.filter((c) => c.category === "vocab").map((c) => c.id),
        particleIds: sentences.filter((c) => c.category === "particle").map((c) => c.id),
        kanjiById: new Map(kanji.map((c) => [c.id, c])),
        vocabById: new Map(vocab.map((c) => [c.id, c])),
        sentenceById: new Map(sentences.map((c) => [c.id, c])),
        vocabByWord: new Map(vocab.map((c) => [c.word, c])),
      });
    } catch (err) {
      set({ ready: false, error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
