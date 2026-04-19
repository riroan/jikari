"use client";

import { create } from "zustand";
import type {
  CardMode,
  Chapter,
  ChapterMember,
  ExpressionCard,
  GrammarCard,
  GrammarPatternCard,
  KanjiCard,
  ParticleContrastCard,
  SentenceCard,
  VocabCard,
} from "./types";

interface CardsState {
  ready: boolean;
  error: string | null;
  kanji: KanjiCard[];
  vocab: VocabCard[];
  sentences: SentenceCard[];
  grammar: GrammarCard[];
  kanjiIds: string[];
  vocabIds: string[];
  /** IDs of sentence cards with category === "vocab" (verbs/adjectives blanks) */
  sentenceIds: string[];
  /** IDs of sentence cards with category === "particle" */
  particleIds: string[];
  /** IDs of grammar cards with type === "pattern" (문형) */
  grammarPatternIds: string[];
  /** IDs of grammar cards with type === "particle_contrast" (助詞 대조) */
  grammarParticleContrastIds: string[];
  kanjiById: Map<string, KanjiCard>;
  vocabById: Map<string, VocabCard>;
  sentenceById: Map<string, SentenceCard>;
  grammarById: Map<string, GrammarCard>;
  vocabByWord: Map<string, VocabCard>;
  /** Chapters in display order. Empty until /api/cards seeds them. */
  chapters: Chapter[];
  /** All chapter↔card edges. Group by chapterId for membership. */
  chapterMembers: ChapterMember[];
  /** chapterId → array of {mode, cardId} members (precomputed). */
  membersByChapter: Map<string, ChapterMember[]>;
  /** 일상표현 카드. 0011 migration 미적용 또는 seed 없음 → 빈 배열 (soft-fail). */
  expressions: ExpressionCard[];
  expressionIds: string[];
  expressionById: Map<string, ExpressionCard>;
  hydrate: () => Promise<void>;
}

const emptyMaps = {
  kanji: [] as KanjiCard[],
  vocab: [] as VocabCard[],
  sentences: [] as SentenceCard[],
  grammar: [] as GrammarCard[],
  kanjiIds: [] as string[],
  vocabIds: [] as string[],
  sentenceIds: [] as string[],
  particleIds: [] as string[],
  grammarPatternIds: [] as string[],
  grammarParticleContrastIds: [] as string[],
  kanjiById: new Map<string, KanjiCard>(),
  vocabById: new Map<string, VocabCard>(),
  sentenceById: new Map<string, SentenceCard>(),
  grammarById: new Map<string, GrammarCard>(),
  vocabByWord: new Map<string, VocabCard>(),
  chapters: [] as Chapter[],
  chapterMembers: [] as ChapterMember[],
  membersByChapter: new Map<string, ChapterMember[]>(),
  expressions: [] as ExpressionCard[],
  expressionIds: [] as string[],
  expressionById: new Map<string, ExpressionCard>(),
};

function indexMembersByChapter(members: ChapterMember[]): Map<string, ChapterMember[]> {
  const m = new Map<string, ChapterMember[]>();
  for (const member of members) {
    const arr = m.get(member.chapterId);
    if (arr) arr.push(member);
    else m.set(member.chapterId, [member]);
  }
  return m;
}

export const useCardsStore = create<CardsState>((set, get) => ({
  ready: false,
  error: null,
  ...emptyMaps,

  hydrate: async () => {
    if (get().ready) return;
    // Clear any prior error so the boundary re-renders the loading state
    // while we retry.
    set({ error: null });

    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [500, 1500];

    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("/api/cards", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const {
          kanji,
          vocab,
          sentences,
          grammar = [],
          chapters = [],
          chapterMembers = [],
          expressions = [],
        } = (await res.json()) as {
          kanji: KanjiCard[];
          vocab: VocabCard[];
          sentences: SentenceCard[];
          grammar?: GrammarCard[];
          chapters?: Chapter[];
          chapterMembers?: ChapterMember[];
          expressions?: ExpressionCard[];
        };
        set({
          ready: true,
          error: null,
          kanji,
          vocab,
          sentences,
          grammar,
          kanjiIds: kanji.map((c) => c.id),
          vocabIds: vocab.map((c) => c.id),
          sentenceIds: sentences.filter((c) => c.category === "vocab").map((c) => c.id),
          particleIds: sentences.filter((c) => c.category === "particle").map((c) => c.id),
          grammarPatternIds: grammar
            .filter((c): c is GrammarPatternCard => c.type === "pattern")
            .map((c) => c.id),
          grammarParticleContrastIds: grammar
            .filter((c): c is ParticleContrastCard => c.type === "particle_contrast")
            .map((c) => c.id),
          kanjiById: new Map(kanji.map((c) => [c.id, c])),
          vocabById: new Map(vocab.map((c) => [c.id, c])),
          sentenceById: new Map(sentences.map((c) => [c.id, c])),
          grammarById: new Map(grammar.map((c) => [c.id, c])),
          vocabByWord: new Map(vocab.map((c) => [c.word, c])),
          chapters,
          chapterMembers,
          membersByChapter: indexMembersByChapter(chapterMembers),
          expressions,
          expressionIds: expressions.map((c) => c.id),
          expressionById: new Map(expressions.map((c) => [c.id, c])),
        });
        return;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
        }
      }
    }
    set({
      ready: false,
      error: lastErr instanceof Error ? lastErr.message : String(lastErr),
    });
  },
}));
