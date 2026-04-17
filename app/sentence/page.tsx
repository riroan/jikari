"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { ModeTabs, type StudyMode } from "@/components/ModeTabs";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import { SENTENCE_IDS, generateSentenceChoices, getSentence } from "@/lib/data";
import { shuffleIds } from "@/lib/deck";
import type { SentenceCard } from "@/lib/types";

const BLANK = "＿＿＿";

export default function SentencePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [mode, setMode] = useState<StudyMode>("quiz");
  const review = useStore((s) => s.review);

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () => shuffleIds(SENTENCE_IDS, seed + epoch * 7919),
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

  const cardId = deck[index] ?? SENTENCE_IDS[0];
  const card: SentenceCard | undefined = getSentence(cardId);

  if (!mounted || !card) {
    return <Shell mode={mode} setMode={setMode} />;
  }

  return (
    <Shell mode={mode} setMode={setMode}>
      {mode === "study" ? (
        <StudyCard
          body={<SentenceStudyBody card={card} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <SentenceQuiz
          card={card}
          seed={seed + index + epoch * 977}
          onResolved={(wasCorrect) => {
            review("sentence", card.id, wasCorrect);
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
            文章
          </h1>
        </header>
        <ModeTabs mode={mode} onChange={setMode} />
        {children}
      </div>
    </main>
  );
}

function SentenceQuiz({
  card,
  seed,
  onResolved,
}: {
  card: SentenceCard;
  seed: number;
  onResolved: (correct: boolean) => void;
}) {
  const choices = generateSentenceChoices(card, seed);
  return (
    <QuizCard
      question={
        <div>
          <div
            className="text-[28px] leading-[1.9] font-medium mb-4"
            style={{
              fontFamily: "var(--font-jp-serif)",
              color: "var(--fg)",
              letterSpacing: "-0.01em",
            }}
          >
            {card.sentenceRuby ? (
              <RubyText text={card.sentenceRuby} />
            ) : (
              card.sentence
            )}
          </div>
          <div className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
            {card.translation}
          </div>
        </div>
      }
      subtitle="빈칸에 들어갈 말은?"
      choiceFontFamily="var(--font-jp-sans)"
      choices={choices.choices}
      correct={choices.correct}
      back={<SentenceBack card={card} />}
      onResolved={onResolved}
    />
  );
}

function SentenceStudyBody({ card }: { card: SentenceCard }) {
  // Study mode: show the full sentence with the blank already filled in.
  const hasRuby = Boolean(card.sentenceRuby);
  const sentenceSrc = card.sentenceRuby ?? card.sentence;
  const answerSrc = card.blankRuby ?? card.blank;
  const [before, after] = sentenceSrc.split(BLANK);

  return (
    <div className="flex flex-col gap-5">
      <div
        className="text-[28px] leading-[1.9] font-medium"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.01em",
        }}
      >
        {hasRuby ? <RubyText text={before ?? ""} /> : before}
        <span className="text-[color:var(--accent-progress)] font-semibold">
          {hasRuby ? <RubyText text={answerSrc} /> : answerSrc}
        </span>
        {after !== undefined && (hasRuby ? <RubyText text={after} /> : after)}
      </div>
      <div className="text-[14px] text-[color:var(--fg-soft)] leading-relaxed">
        {card.translation}
      </div>
    </div>
  );
}

function SentenceBack({ card }: { card: SentenceCard }) {
  const hasRuby = Boolean(card.sentenceRuby);
  const sentenceSrc = card.sentenceRuby ?? card.sentence;
  const answerSrc = card.blankRuby ?? card.blank;
  const [before, after] = sentenceSrc.split(BLANK);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="text-[28px] leading-[1.9] font-medium"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.01em",
        }}
      >
        {hasRuby ? <RubyText text={before ?? ""} /> : before}
        <span className="text-[color:var(--accent-progress)] font-semibold underline decoration-dotted underline-offset-4">
          {hasRuby ? <RubyText text={answerSrc} /> : answerSrc}
        </span>
        {after !== undefined && (hasRuby ? <RubyText text={after} /> : after)}
      </div>
      <div className="text-[14px] text-[color:var(--fg-soft)] leading-relaxed">
        {card.translation}
      </div>
    </div>
  );
}
