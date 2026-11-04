"use client";

import { useMemo } from "react";
import { useCardsStore } from "./cards-store";
import { findExamples, getExampleIndex, type Example } from "./examples";
import { wordsWithKanji } from "./kanji-words";
import type { KanjiCard, VocabCard } from "./types";

/** First example sentence for a vocab word (null when none). Shown only after a wrong answer. */
export function useVocabMissExample(card: VocabCard): Example | null {
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  return useMemo(
    () => findExamples(card, getExampleIndex(sentences, expressions), 1)[0] ?? null,
    [card, sentences, expressions],
  );
}

/** First example sentence of any compound word containing the kanji (null when none). */
export function useKanjiMissExample(card: KanjiCard): Example | null {
  const vocab = useCardsStore((s) => s.vocab);
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  return useMemo(() => {
    const idx = getExampleIndex(sentences, expressions);
    for (const w of wordsWithKanji(card.kanji, vocab)) {
      const ex = findExamples(w, idx, 1)[0];
      if (ex) return ex;
    }
    return null;
  }, [card, vocab, sentences, expressions]);
}
