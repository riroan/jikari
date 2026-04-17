"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { useStore } from "@/lib/store";
import { generateKanjiChoices, getKanji } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds } from "@/lib/deck";
import type { KanjiCard } from "@/lib/types";

type StudyMode = "study" | "quiz";

type QType = "on" | "kun";

export default function KanjiPage() {
  return (
    <Suspense fallback={<Shell />}>
      <KanjiPageInner />
    </Suspense>
  );
}

function KanjiPageInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const kanjiIds = useCardsStore((s) => s.kanjiIds);

  // Infinite random deck (reshuffles when exhausted)
  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () => shuffleIds(kanjiIds, seed + epoch * 7919),
    [seed, epoch, kanjiIds]
  );

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

  const retreat = () => {
    setIndex((i) => {
      if (i === 0) {
        setEpoch((e) => Math.max(0, e - 1));
        return deck.length - 1;
      }
      return i - 1;
    });
  };

  const cardId = deck[index] ?? kanjiIds[0];
  const card: KanjiCard | undefined = getKanji(cardId);

  if (!mounted || !card) {
    return <Shell />;
  }

  return (
    <Shell>
      {mode === "study" ? (
        <StudyCard
          body={<KanjiStudyBody card={card} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <KanjiQuiz
          card={card}
          seed={seed + index + epoch * 977}
          onResolved={(wasCorrect) => {
            review("kanji", card.id, wasCorrect);
            advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header className="flex justify-between items-baseline mb-8">
          <Link
            href="/"
            className="text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          <h1
            className="text-[15px] tracking-[0.15em] text-[color:var(--fg-soft)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            漢字
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function KanjiQuiz({
  card,
  seed,
  onResolved,
}: {
  card: KanjiCard;
  seed: number;
  onResolved: (correct: boolean) => void;
}) {
  const qType: QType =
    card.onReadings.length > 0 && card.kunReadings.length > 0
      ? seed % 2 === 0
        ? "on"
        : "kun"
      : card.onReadings.length > 0
      ? "on"
      : "kun";

  const choices = generateKanjiChoices(card, qType, seed);

  return (
    <QuizCard
      question={
        <div
          className="text-[148px] leading-none font-semibold"
          style={{
            fontFamily: "var(--font-jp-serif)",
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          {card.kanji}
        </div>
      }
      subtitle={qType === "on" ? "音読み" : "訓読み"}
      choices={choices.choices}
      correct={choices.correct}
      back={<KanjiBack card={card} />}
      onResolved={onResolved}
    />
  );
}

function KanjiStudyBody({ card }: { card: KanjiCard }) {
  // Identical to quiz back — in study mode, everything is visible from the start.
  return <KanjiBack card={card} />;
}

function KanjiBack({ card }: { card: KanjiCard }) {
  return (
    <div
      className="flex flex-col gap-4 text-[color:var(--fg-soft)]"
      style={{ fontFamily: "var(--font-jp-sans)" }}
    >
      <div
        className="text-[148px] leading-none font-semibold"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}
      >
        {card.kanji}
      </div>
      <div className="flex flex-col gap-1.5 pl-1">
        {card.onReadings.length > 0 && (
          <div className="flex gap-3.5 items-baseline">
            <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
              音
            </span>
            <span className="text-[17px] text-[color:var(--fg-soft)]">
              {card.onReadings.join(" ・ ")}
            </span>
          </div>
        )}
        {card.kunReadings.length > 0 && (
          <div className="flex gap-3.5 items-baseline">
            <span className="text-[11px] text-[color:var(--fg-faint)] tracking-[0.18em] w-9 font-medium">
              訓
            </span>
            <span className="text-[17px] text-[color:var(--fg-soft)]">
              {card.kunReadings.join(" ・ ")}
            </span>
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-dashed border-[color:var(--line)] flex gap-2.5 items-baseline">
          <span
            className="text-xs font-semibold tracking-[0.1em] text-[color:var(--accent-korean)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            韓
          </span>
          <span className="text-[14px] text-[color:var(--fg-soft)]">
            {card.koreanMeaning} {card.koreanSound.join("·")}
            {card.koreanHanja !== card.kanji && (
              <span className="ml-2 text-[color:var(--fg-faint)] text-xs">
                ({card.koreanHanja})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
