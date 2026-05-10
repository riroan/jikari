"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChapterQuizCard } from "@/components/ChapterQuizCard";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { weightedShuffleIds } from "@/lib/deck";
import type {
  ChapterMember,
  GrammarCard,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "@/lib/types";

type AnyCard = KanjiCard | VocabCard | SentenceCard | GrammarCard;

/**
 * /chapters/[id]?mode=quiz body — owns the per-session deck state
 * (seed/epoch/index/correct-wrong tally) and dispatches each card to
 * ChapterQuizCard. Pulled out of page.tsx so the chapter detail file
 * focuses on routing/data wiring.
 *
 * Deck is box-weighted (matches /vocab et al.): box-1/2/3 cards surface
 * every epoch, box-5 only ~1/14.
 */
export function ChapterQuizDeck({
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

  const ids = useMemo(
    () => members.map(({ member }) => `${member.mode}:${member.cardId}`),
    [members],
  );

  const deck = useMemo(
    () =>
      weightedShuffleIds(
        ids,
        (id) => {
          // Map "{mode}:{cardId}" back to the SRS state key (grammar uses
          // the pattern:/particle: subtype prefix).
          const colonIdx = id.indexOf(":");
          const mode = id.slice(0, colonIdx);
          const cardId = id.slice(colonIdx + 1);
          const states = useStore.getState().learningStates;
          if (mode === "grammar") {
            const card = grammarById.get(cardId);
            const sub = card?.type === "pattern" ? "pattern" : "particle";
            return (states[`grammar:${sub}:${cardId}`]?.box ?? 1) as
              | 1 | 2 | 3 | 4 | 5;
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
