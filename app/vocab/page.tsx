"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { ModeTabs, type StudyMode } from "@/components/ModeTabs";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import { VOCAB_IDS, generateVocabChoices, getVocab } from "@/lib/data";
import { shuffleIds } from "@/lib/deck";
import type { VocabCard } from "@/lib/types";

export default function VocabPage() {
  return (
    <Suspense fallback={<Shell mode="quiz" setMode={() => {}} />}>
      <VocabPageInner />
    </Suspense>
  );
}

function VocabPageInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";
  const setMode = (next: StudyMode) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "quiz") params.delete("mode");
    else params.set("mode", next);
    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const review = useStore((s) => s.review);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () => shuffleIds(VOCAB_IDS, seed + epoch * 7919),
    [seed, epoch]
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

  const cardId = deck[index] ?? VOCAB_IDS[0];
  const card: VocabCard | undefined = getVocab(cardId);

  if (!mounted || !card) {
    return <Shell mode={mode} setMode={setMode} />;
  }

  return (
    <Shell mode={mode} setMode={setMode}>
      {mode === "study" ? (
        <StudyCard
          body={<VocabStudyBody card={card} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <VocabQuiz
          card={card}
          seed={seed + index + epoch * 977}
          onResolved={(wasCorrect) => {
            review("vocab", card.id, wasCorrect);
            advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({
  mode,
  setMode,
  children,
}: {
  mode: StudyMode;
  setMode: (m: StudyMode) => void;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header className="flex justify-between items-baseline mb-6">
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
            単語
          </h1>
        </header>
        <ModeTabs mode={mode} onChange={setMode} />
        {children}
      </div>
    </main>
  );
}

function VocabQuiz({
  card,
  seed,
  onResolved,
}: {
  card: VocabCard;
  seed: number;
  onResolved: (correct: boolean) => void;
}) {
  const choices = generateVocabChoices(card, seed);
  return (
    <QuizCard
      question={
        <div>
          <div
            className="text-[56px] leading-tight font-semibold mb-2"
            style={{
              fontFamily: "var(--font-jp-serif)",
              letterSpacing: "-0.02em",
              color: "var(--fg)",
            }}
          >
            {card.ruby ? <RubyText text={card.ruby} /> : card.word}
          </div>
          {!card.ruby && (
            <div
              className="text-[16px] text-[color:var(--fg-faint)]"
              style={{ fontFamily: "var(--font-jp-sans)" }}
            >
              {card.reading}
            </div>
          )}
        </div>
      }
      subtitle="의미는?"
      choiceFontFamily="var(--font-kr-sans)"
      choices={choices.choices}
      correct={choices.correct}
      back={<VocabBack card={card} />}
      onResolved={onResolved}
    />
  );
}

function VocabStudyBody({ card }: { card: VocabCard }) {
  return <VocabBack card={card} />;
}

function VocabBack({ card }: { card: VocabCard }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="text-[56px] leading-tight font-semibold"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}
      >
        {card.ruby ? <RubyText text={card.ruby} /> : card.word}
      </div>
      {!card.ruby && (
        <div
          className="text-[16px] text-[color:var(--fg-faint)]"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {card.reading}
        </div>
      )}
      <div className="text-[18px] text-[color:var(--fg)] leading-relaxed font-medium mt-1">
        {card.koreanMeanings.join(", ")}
      </div>
      <div className="text-[12px] text-[color:var(--fg-faint)] leading-relaxed">
        {card.meanings.join(", ")}
      </div>
    </div>
  );
}
