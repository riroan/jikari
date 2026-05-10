"use client";

import { Suspense, use, useMemo } from "react";
import { useIsClient, useClientNow } from "@/lib/use-is-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChapterOverview } from "@/components/ChapterOverview";
import { ChapterQuizDeck } from "@/components/ChapterQuizDeck";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { aggregateChapterMastery } from "@/lib/chapter-mastery";
import {
  getKanji,
  getVocab,
  getSentence,
  getGrammar,
} from "@/lib/data";
import type {
  CardMode,
  ChapterMember,
  GrammarCard,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "@/lib/types";

type Mode = "overview" | "quiz";

export default function ChapterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Shell chapterId={id} />}>
      <ChapterDetailInner id={id} />
    </Suspense>
  );
}

function ChapterDetailInner({ id }: { id: string }) {
  const mounted = useIsClient();
  const now = useClientNow();

  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get("mode") === "quiz" ? "quiz" : "overview";

  const chapters = useCardsStore((s) => s.chapters);
  const membersByChapter = useCardsStore((s) => s.membersByChapter);
  const grammarById = useCardsStore((s) => s.grammarById);
  const learningStates = useStore((s) => s.learningStates);

  const chapter = chapters.find((c) => c.id === id);
  const allMembers = membersByChapter.get(id) ?? [];

  // Filter to members whose card actually exists in cards-store (fail-soft).
  const validMembers = useMemo(() => {
    const out: Array<{ member: ChapterMember; card: AnyCard }> = [];
    for (const m of allMembers) {
      const card = lookupCard(m);
      if (card) out.push({ member: m, card });
    }
    return out;
  }, [allMembers, grammarById]);

  // Per-mode due breakdown for the Overview's CARDS panel. Uses the same
  // grammar-key convention ChapterQuizCard does (pattern:/particle: prefix).
  const dueCountsByMode = useMemo<Record<CardMode, number>>(() => {
    const empty: Record<CardMode, number> = {
      kanji: 0,
      vocab: 0,
      sentence: 0,
      grammar: 0,
      conjugation: 0,
      adjective: 0,
      expression: 0,
    };
    if (!mounted || now === null) return empty;
    const counts = { ...empty };
    for (const { member } of validMembers) {
      let key: string;
      if (member.mode === "grammar") {
        const card = grammarById.get(member.cardId);
        const sub = card?.type === "pattern" ? "pattern" : "particle";
        key = `grammar:${sub}:${member.cardId}`;
      } else {
        key = `${member.mode}:${member.cardId}`;
      }
      const s = learningStates[key];
      if (s && s.lastReviewed > 0 && s.nextDue <= now) {
        counts[member.mode]++;
      }
    }
    return counts;
  }, [validMembers, learningStates, grammarById, mounted, now]);

  // Mastery summary — reuses the same aggregation as the home list.
  const mastery = useMemo(() => {
    const cardExists = (mode: CardMode, cardId: string) => {
      switch (mode) {
        case "kanji":
          return useCardsStore.getState().kanjiById.has(cardId);
        case "vocab":
          return useCardsStore.getState().vocabById.has(cardId);
        case "sentence":
          return useCardsStore.getState().sentenceById.has(cardId);
        case "grammar":
          return useCardsStore.getState().grammarById.has(cardId);
        default:
          return false;
      }
    };
    const getBox = (mode: CardMode, cardId: string) =>
      useStore.getState().learningStates[`${mode}:${cardId}`]?.box ?? 1;
    const grammarLookup = (gid: string) => grammarById.get(gid);
    return aggregateChapterMastery(allMembers, cardExists, getBox, grammarLookup);
  }, [allMembers, learningStates, grammarById]);

  if (!chapter) {
    return (
      <Shell chapterId={id}>
        <NotFound id={id} />
      </Shell>
    );
  }

  if (!mounted) {
    return <Shell chapterId={id} title={chapter.name} />;
  }

  if (mode === "quiz") {
    return (
      <Shell chapterId={id} title={chapter.name}>
        <ChapterQuizDeck chapterId={id} members={validMembers} />
      </Shell>
    );
  }

  return (
    <Shell chapterId={id} title={chapter.name}>
      <ChapterOverview
        chapter={chapter}
        members={validMembers}
        mastery={mastery}
        mounted={mounted}
        dueCountsByMode={dueCountsByMode}
      />
    </Shell>
  );
}

// ─── lookupCard ─────────────────────────────────────────────────────────────
type AnyCard = KanjiCard | VocabCard | SentenceCard | GrammarCard;

function lookupCard(m: ChapterMember): AnyCard | undefined {
  switch (m.mode) {
    case "kanji":
      return getKanji(m.cardId);
    case "vocab":
      return getVocab(m.cardId);
    case "sentence":
      return getSentence(m.cardId);
    case "grammar":
      return getGrammar(m.cardId);
    default:
      return undefined;
  }
}

// ─── Shell ──────────────────────────────────────────────────────────────────
function Shell({
  chapterId,
  title,
  children,
}: {
  chapterId: string;
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex justify-center">
      <div className="w-full max-w-[390px] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-8 pb-10">
        <header className="flex justify-between items-baseline mb-8">
          <Link
            href="/chapters"
            className="inline-flex items-center min-h-[44px] -ml-2 px-2 text-caption text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← UNITS
          </Link>
          <h1
            className="text-title leading-none font-semibold tracking-tab text-[color:var(--fg)] truncate ml-3 min-w-0 text-right"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            {title ?? chapterId}
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function NotFound({ id }: { id: string }) {
  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="text-[15px] text-[color:var(--fg)]">
        챕터를 찾을 수 없습니다: <code className="text-label">{id}</code>
      </p>
      <Link
        href="/chapters"
        className="text-caption text-[color:var(--fg-faint)] underline hover:text-[color:var(--fg)]"
      >
        ← 단원 목록으로
      </Link>
    </div>
  );
}
