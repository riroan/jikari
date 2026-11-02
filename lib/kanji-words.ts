import type { VocabCard } from "./types";

/** Vocab containing each kanji, easiest JLPT level first (5 = N5), then shorter words. */
let cache: { vocab: VocabCard[]; idx: Map<string, VocabCard[]> } | null = null;

function build(vocab: VocabCard[]): Map<string, VocabCard[]> {
  const idx = new Map<string, VocabCard[]>();
  const sorted = [...vocab].sort(
    (a, b) => b.jlptLevel - a.jlptLevel || a.word.length - b.word.length,
  );
  for (const v of sorted) {
    for (const ch of new Set(v.word)) {
      if (v.word === ch) continue; // the kanji's own single-char card
      const list = idx.get(ch);
      if (list) list.push(v);
      else idx.set(ch, [v]);
    }
  }
  return idx;
}

export function wordsWithKanji(kanji: string, vocab: VocabCard[], max = 3): VocabCard[] {
  if (cache?.vocab !== vocab) cache = { vocab, idx: build(vocab) };
  return (cache.idx.get(kanji) ?? []).slice(0, max);
}
