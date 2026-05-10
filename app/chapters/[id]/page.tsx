"use client";

import { Suspense, use, useMemo, useState } from "react";
import { useIsClient, useClientNow } from "@/lib/use-is-client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChapterQuizCard } from "@/components/ChapterQuizCard";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { aggregateChapterMastery } from "@/lib/chapter-mastery";
import { intensityBg, ratioToIntensity } from "@/lib/intensity";
import { weightedShuffleIds } from "@/lib/deck";
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
      <Overview
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

// ─── Overview ───────────────────────────────────────────────────────────────
function Overview({
  chapter,
  members,
  mastery,
  mounted,
  dueCountsByMode,
}: {
  chapter: { id: string; name: string; intro: string | null };
  members: Array<{ member: ChapterMember; card: AnyCard }>;
  mastery: { masteredCount: number; validMembers: number; ratio: number };
  mounted: boolean;
  dueCountsByMode: Record<CardMode, number>;
}) {
  const percent = mounted ? Math.round(mastery.ratio * 100) : 0;
  const intensity = mounted ? ratioToIntensity(mastery.ratio) : 0;

  // Mode counts for preview.
  const counts: Record<CardMode, number> = {
    kanji: 0,
    vocab: 0,
    sentence: 0,
    grammar: 0,
    conjugation: 0,
    adjective: 0,
    expression: 0,
  };
  for (const { member } of members) counts[member.mode]++;

  return (
    <div className="flex flex-col gap-8">
      {/* Mastery summary */}
      <section>
        <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2 font-medium">
          MASTERY
        </div>
        <div className="flex items-baseline gap-3">
          <div
            className="text-[40px] font-semibold tabular-nums leading-none"
            style={{
              fontFamily: "var(--font-jp-serif)",
              letterSpacing: "-0.02em",
              color: "var(--accent-progress)",
            }}
          >
            {percent}
            <span className="text-lg text-[color:var(--fg-faint)] font-normal ml-0.5">
              %
            </span>
          </div>
          <div className="text-caption text-[color:var(--fg-faint)] tabular-nums">
            {mastery.masteredCount} / {mastery.validMembers} 카드
          </div>
        </div>
        <div
          className="relative mt-3 h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: intensityBg(0) }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-300"
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
              background: intensityBg(intensity),
            }}
          />
        </div>
      </section>

      {/* Intro */}
      {chapter.intro && (
        <section>
          <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2 font-medium">
            ABOUT
          </div>
          <p className="text-[15px] text-[color:var(--fg-soft)] leading-relaxed">
            {chapter.intro}
          </p>
        </section>
      )}

      {/* Member preview — count per mode */}
      <section>
        <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-2 font-medium">
          CARDS
        </div>
        <ul className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden">
          {(
            [
              ["vocab", "단어 / 単語"],
              ["kanji", "한자 / 漢字"],
              ["sentence", "문장·조사 / 文章·助詞"],
              ["grammar", "문법 / 文法"],
            ] as const
          )
            .filter(([m]) => counts[m] > 0)
            .map(([m, label]) => {
              const due =
                m === "sentence"
                  ? dueCountsByMode.sentence
                  : dueCountsByMode[m];
              return (
                <li
                  key={m}
                  className="bg-[color:var(--bg)] flex items-baseline justify-between px-4 py-2.5"
                >
                  <span className="text-small text-[color:var(--fg)]">
                    {label}
                  </span>
                  <span className="text-caption text-[color:var(--fg-faint)] tabular-nums">
                    {counts[m]}장
                    {due > 0 && (
                      <span className="ml-2 text-[color:var(--accent-progress)] font-medium">
                        ・{due} 복습
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
        </ul>
      </section>

      {/* Quiz button — label reflects review backlog when there is one. */}
      {members.length > 0 &&
        (() => {
          const totalDue = Object.values(dueCountsByMode).reduce(
            (a, b) => a + b,
            0,
          );
          // When there's a backlog the CTA goes "live" — accent-progress fill
          // signals "this is the action to take right now". Otherwise the
          // muted bg-deep keeps the page calm.
          const live = totalDue > 0;
          return (
            <section>
              <Link
                href={`/chapters/${chapter.id}?mode=quiz`}
                className={`flex items-center justify-center text-body font-medium px-4 py-3 rounded-sm transition-colors min-h-[44px] ${
                  live
                    ? "bg-[color:var(--accent-progress)] text-[color:var(--bg)] hover:opacity-90"
                    : "bg-[color:var(--bg-deep)] text-[color:var(--fg)] hover:bg-[color:var(--accent-korean)] hover:text-[color:var(--bg)]"
                }`}
              >
                {live
                  ? `복습 ${totalDue}장 시작 →`
                  : "이 챕터 퀴즈 시작 →"}
              </Link>
            </section>
          );
        })()}

      {members.length === 0 && (
        <section className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
          이 챕터에 사용 가능한 카드가 아직 없습니다. 콘텐츠 시드를 더 추가하면
          자동으로 채워져요.
        </section>
      )}
    </div>
  );
}

// ─── ChapterQuizDeck ────────────────────────────────────────────────────────
function ChapterQuizDeck({
  chapterId,
  members,
}: {
  chapterId: string;
  members: Array<{ member: ChapterMember; card: AnyCard }>;
}) {
  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const typingThreshold = useStore((s) => s.settings.typingThresholdBox);
  const grammarById = useCardsStore((s) => s.grammarById);

  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<{ correct: number; wrong: number }>({
    correct: 0,
    wrong: 0,
  });

  // Stable per-member id for shuffle. Members are already valid (filtered).
  const ids = useMemo(
    () => members.map(({ member }) => `${member.mode}:${member.cardId}`),
    [members],
  );
  // Box-weighted: low-box (due/struggling) cards surface every epoch, box-5
  // mastered ones appear ~1/14. Matches the same SRS cadence the dedicated
  // mode pages use, so chapter-mode review feels identical to vocab/kanji
  // review without a separate "due-only" path.
  const deck = useMemo(
    () =>
      weightedShuffleIds(
        ids,
        (id) => {
          // Map "{mode}:{cardId}" back to the SRS state key (grammar uses the
          // pattern:/particle: subtype prefix).
          const colonIdx = id.indexOf(":");
          const mode = id.slice(0, colonIdx);
          const cardId = id.slice(colonIdx + 1);
          const states = useStore.getState().learningStates;
          if (mode === "grammar") {
            const card = grammarById.get(cardId);
            const sub = card?.type === "pattern" ? "pattern" : "particle";
            return (states[`grammar:${sub}:${cardId}`]?.box ?? 1) as 1 | 2 | 3 | 4 | 5;
          }
          return (states[`${mode}:${cardId}`]?.box ?? 1) as 1 | 2 | 3 | 4 | 5;
        },
        seed + epoch * 7919,
      ),
    [ids, seed, epoch, grammarById],
  );

  const currentKey = deck[index];
  const current = members.find(
    ({ member }) => `${member.mode}:${member.cardId}` === currentKey,
  );

  if (members.length === 0 || !current) {
    return (
      <div className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
        이 챕터에 카드가 없습니다.{" "}
        <Link
          href={`/chapters/${chapterId}`}
          className="underline hover:text-[color:var(--fg)]"
        >
          ← 돌아가기
        </Link>
      </div>
    );
  }

  // Look up the box under the *subtyped* SRS key (grammar pattern:/particle:).
  const box = (() => {
    const m = current.member;
    let key = `${m.mode}:${m.cardId}`;
    if (m.mode === "grammar") {
      const gc = grammarById.get(m.cardId);
      if (gc) {
        key = `grammar:${gc.type === "pattern" ? "pattern" : "particle"}:${gc.id}`;
      }
    }
    const states = useStore.getState().learningStates;
    return (states[key]?.box ?? 1) as 1 | 2 | 3 | 4 | 5;
  })();

  const advance = () => {
    setIndex((i) => {
      const next = i + 1;
      if (next >= deck.length) {
        setEpoch((e) => e + 1);
        return 0;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-caption text-[color:var(--fg-faint)] tracking-label font-medium">
        <span>
          {index + 1} / {deck.length}
        </span>
        <span className="tabular-nums">
          ◯ {stats.correct} ・ ✕ {stats.wrong}
        </span>
      </div>

      <ChapterQuizCard
        key={`${currentKey}:${epoch}:${index}`}
        member={current.member}
        card={current.card}
        seed={seed + index + epoch * 977}
        box={box}
        typingThreshold={typingThreshold}
        onResolved={(srsMode, srsCardId, wasCorrect, answerMode) => {
          review(srsMode, srsCardId, wasCorrect, answerMode);
          recordQuizResult(srsMode === "grammar" ? "grammar" : srsMode, wasCorrect);
          setStats((s) =>
            wasCorrect
              ? { ...s, correct: s.correct + 1 }
              : { ...s, wrong: s.wrong + 1 },
          );
          advance();
        }}
      />
    </div>
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
