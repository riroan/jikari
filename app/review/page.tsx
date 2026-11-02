"use client";

import { useState } from "react";
import { ChapterQuizDeck } from "@/components/ChapterQuizDeck";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { useIsClient } from "@/lib/use-is-client";
import { getGrammar, getKanji, getSentence, getVocab } from "@/lib/data";
import { buildReviewDeck, type ReviewMode } from "@/lib/review-deck";

const lookup = (mode: ReviewMode, id: string) =>
  mode === "kanji" ? getKanji(id)
  : mode === "vocab" ? getVocab(id)
  : mode === "sentence" ? getSentence(id)
  : getGrammar(id);

export default function ReviewPage() {
  const mounted = useIsClient();
  const ready = useCardsStore((s) => s.ready);
  return (
    <ModePageShell title="復習">
      {mounted && ready ? <Session /> : null}
    </ModePageShell>
  );
}

function Session() {
  // 한 번만 뽑는다 — 답할 때마다 due가 줄어도 덱 순서가 흔들리지 않게.
  const [members] = useState(() => {
    const { sentenceIds } = useCardsStore.getState();
    const sentences = new Set(sentenceIds); // 조사 문장은 /particle 소관
    return buildReviewDeck(
      useStore.getState().learningStates,
      Date.now(),
      (m, id) => (m !== "sentence" || sentences.has(id)) && !!lookup(m, id),
    ).flatMap(({ mode, cardId }) => {
      const card = lookup(mode, cardId);
      return card
        ? [{ member: { chapterId: "review", mode, cardId }, card }]
        : [];
    });
  });

  if (members.length === 0) {
    return (
      <div className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
        오늘 복습할 카드가 없어요. 공부나 퀴즈를 풀면 여기에 쌓여요.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption text-[color:var(--fg-faint)] tracking-wide">
        한자·단어·문장·문법 섞어서 · 최대 20장
      </p>
      <ChapterQuizDeck chapterId="review" members={members} fixedOrder />
    </div>
  );
}
