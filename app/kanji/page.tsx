"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuizCard } from "@/components/QuizCard";
import { QuizStats } from "@/components/QuizStats";
import { StudyCard } from "@/components/StudyCard";
import { useStore } from "@/lib/store";
import { generateKanjiChoices, getKanji } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { weightedShuffleIds } from "@/lib/deck";
import { pickMode } from "@/lib/srs";
import { normalizeJapanese } from "@/lib/normalize";
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
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const threshold = useStore((s) => s.settings.typingThresholdBox);
  const kanjiIds = useCardsStore((s) => s.kanjiIds);

  // Quiz: infinite shuffled deck. Study: stable order for predictable browsing.
  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () =>
      mode === "study"
        ? kanjiIds
        : weightedShuffleIds(
            kanjiIds,
            (id) => getBox("kanji", id),
            seed + epoch * 7919,
          ),
    [mode, seed, epoch, kanjiIds, getBox]
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
          answerMode={pickMode(getBox("kanji", card.id), threshold)}
          onResolved={(wasCorrect, answerMode) => {
            review("kanji", card.id, wasCorrect, answerMode);
            recordQuizResult("kanji", wasCorrect);
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
            className="inline-flex items-center min-h-[44px] -ml-2 px-2 text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          <QuizStats statKey="kanji" />
          <h1
            className="text-[22px] leading-none font-semibold tracking-tab text-[color:var(--fg)]"
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
  answerMode,
  onResolved,
}: {
  card: KanjiCard;
  seed: number;
  answerMode: "choice" | "typed";
  onResolved: (correct: boolean, mode: "choice" | "typed") => void;
}) {
  const qType: QType =
    card.onReadings.length > 0 && card.kunReadings.length > 0
      ? seed % 2 === 0
        ? "on"
        : "kun"
      : card.onReadings.length > 0
      ? "on"
      : "kun";

  const readings = qType === "on" ? card.onReadings : card.kunReadings;
  const input =
    answerMode === "choice"
      ? (() => {
          const choices = generateKanjiChoices(card, qType, seed);
          return {
            mode: "choice" as const,
            choices: choices.choices,
            correct: choices.correct,
          };
        })()
      : {
          mode: "typed" as const,
          lang: "ja" as const,
          // Pre-normalize to hiragana so comparison is deterministic.
          // Okurigana in kun readings (e.g., "たべ.る") keep dot form — strip for answer set.
          acceptableAnswers: readings.map((r) =>
            normalizeJapanese(r.replace(/[.．]/g, "")),
          ),
        };

  return (
    <QuizCard
      question={
        <div
          className="text-hero leading-none font-semibold"
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
      input={input}
      back={<KanjiBack card={card} />}
      onResolved={(correct) => onResolved(correct, answerMode)}
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
        className="text-hero leading-none font-semibold"
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
            <span className="text-caption text-[color:var(--fg-faint)] tracking-label w-9 font-medium">
              音
            </span>
            <span className="text-body text-[color:var(--fg-soft)]">
              {card.onReadings.join(" ・ ")}
            </span>
          </div>
        )}
        {card.kunReadings.length > 0 && (
          <div className="flex gap-3.5 items-baseline">
            <span className="text-caption text-[color:var(--fg-faint)] tracking-label w-9 font-medium">
              訓
            </span>
            <span className="text-body text-[color:var(--fg-soft)]">
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
          <span className="text-small text-[color:var(--fg-soft)]">
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
