"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QuizCard } from "@/components/QuizCard";
import { QuizStats } from "@/components/QuizStats";
import { StudyCard } from "@/components/StudyCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import {
  generateGrammarQuizChoices,
  getGrammar,
} from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { weightedShuffleIds } from "@/lib/deck";
import type {
  GrammarCard,
  GrammarPatternCard,
  GrammarPatternQuiz,
  ParticleContrastCard,
  ParticleContrastQuiz,
} from "@/lib/types";

type StudyMode = "study" | "quiz";
type GrammarTab = "pattern" | "particle";

export default function GrammarPage() {
  return (
    <Suspense fallback={<Shell />}>
      <GrammarPageInner />
    </Suspense>
  );
}

function GrammarPageInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";
  const tab: GrammarTab =
    searchParams.get("tab") === "particle" ? "particle" : "pattern";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const patternIds = useCardsStore((s) => s.grammarPatternIds);
  const particleIds = useCardsStore((s) => s.grammarParticleContrastIds);
  const ids = tab === "pattern" ? patternIds : particleIds;

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  // Reset index when tab switches so we start from the first card.
  useEffect(() => {
    setIndex(0);
    setEpoch(0);
  }, [tab]);

  const boxPrefix = tab === "pattern" ? "pattern" : "particle";
  const deck = useMemo(
    () =>
      mode === "study"
        ? ids
        : weightedShuffleIds(
            ids,
            (id) => getBox("grammar", `${boxPrefix}:${id}`),
            seed + epoch * 7919,
          ),
    [mode, seed, epoch, ids, getBox, boxPrefix],
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

  const cardId = deck[index];
  const card = cardId ? getGrammar(cardId) : undefined;

  if (!mounted) {
    return <Shell tab={tab} />;
  }

  if (!card) {
    return (
      <Shell tab={tab}>
        <EmptyState />
      </Shell>
    );
  }

  return (
    <Shell tab={tab}>
      {mode === "study" ? (
        <StudyCard
          body={<GrammarStudyBody card={card} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <GrammarQuiz
          card={card}
          seed={seed + index + epoch * 977}
          onResolved={(wasCorrect) => {
            // SRS key: grammar:pattern:{id} / grammar:particle:{id} per eng review
            const subtypedId =
              card.type === "pattern" ? `pattern:${card.id}` : `particle:${card.id}`;
            review("grammar", subtypedId, wasCorrect);
            recordQuizResult("grammar", wasCorrect);
            advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({
  tab = "pattern",
  children,
}: {
  tab?: GrammarTab;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header className="flex justify-between items-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] -ml-2 px-2 text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          <QuizStats statKey="grammar" />
          <div className="flex items-baseline gap-4">
            <h1
              className="text-[22px] leading-none font-semibold tracking-tab text-[color:var(--fg)]"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              文法
            </h1>
          </div>
        </header>

        <TabBar active={tab} />

        {children}
      </div>
    </main>
  );
}

function TabBar({ active }: { active: GrammarTab }) {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "study" ? "study" : "quiz";
  const modeParam = mode === "study" ? "&mode=study" : "";

  return (
    <div role="tablist" className="flex gap-5 mb-8 border-b border-[color:var(--line)]">
      <TabLink
        href={`/grammar?tab=pattern${modeParam}`}
        label={<>문형 <span style={{ fontFamily: "var(--font-jp-sans)" }}>文型</span></>}
        active={active === "pattern"}
      />
      <TabLink
        href={`/grammar?tab=particle${modeParam}`}
        label={<>조사 <span style={{ fontFamily: "var(--font-jp-sans)" }}>助詞</span></>}
        active={active === "particle"}
      />
    </div>
  );
}

function TabLink({
  href,
  label,
  active,
}: {
  href: string;
  label: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      role="tab"
      aria-selected={active}
      href={href}
      className={`inline-flex items-center min-h-[44px] py-2 -mb-px border-b-2 text-small transition-colors tracking-wide ${
        active
          ? "text-[color:var(--fg)] border-[color:var(--accent-korean)]"
          : "text-[color:var(--fg-faint)] border-transparent hover:text-[color:var(--fg-soft)]"
      }`}
    >
      {label}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-3 pt-16">
      <div
        className="text-h1 font-medium text-[color:var(--fg-soft)]"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        まだ
      </div>
      <p className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
        문법 카드 준비 중. <br />
        <code className="text-label">scripts/generate-grammar.ts</code>로 시드 후 다시 열어주세요.
      </p>
    </div>
  );
}

function GrammarStudyBody({ card }: { card: GrammarCard }) {
  if (card.type === "pattern") return <PatternStudyBody card={card} />;
  return <ParticleStudyBody card={card} />;
}

function PatternStudyBody({ card }: { card: GrammarPatternCard }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div
          className="text-[34px] font-semibold leading-[1.3] text-[color:var(--fg)]"
          style={{
            fontFamily: "var(--font-jp-serif)",
            letterSpacing: "-0.01em",
          }}
        >
          <RubyText text={card.pattern} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-caption text-[color:var(--fg-faint)] tracking-tab">
          韓
        </div>
        <div className="text-body text-[color:var(--accent-korean)] font-medium">
          {card.koreanStructure}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-caption text-[color:var(--fg-faint)] tracking-tab">
          意味
        </div>
        <div className="text-[15px] text-[color:var(--fg-soft)]">
          {card.meaningKo}
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-[color:var(--line)] pt-5">
        {card.examples.map((ex, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="text-caption text-[color:var(--fg-faint)] tracking-tab">
              例 {idx + 1}
            </div>
            <div
              className="text-[16px] leading-[1.8] text-[color:var(--fg)]"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              <RubyText text={ex.jp} />
            </div>
            <div className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
              {ex.ko}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParticleStudyBody({ card }: { card: ParticleContrastCard }) {
  const [p1, p2] = card.particles;
  const group1 = card.examples.filter((e) => e.particle === p1);
  const group2 = card.examples.filter((e) => e.particle === p2);

  return (
    <div className="flex flex-col gap-6">
      <div
        className="text-[32px] font-semibold text-[color:var(--fg)]"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        {p1} <span className="text-[color:var(--fg-faint)] text-[24px]">vs</span> {p2}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-caption text-[color:var(--fg-faint)] tracking-tab">
          規則
        </div>
        <div className="text-[15px] text-[color:var(--accent-korean)] leading-relaxed">
          {card.rule}
        </div>
      </div>

      <ParticleGroup particle={p1} items={group1} />
      <ParticleGroup particle={p2} items={group2} />
    </div>
  );
}

function ParticleGroup({
  particle,
  items,
}: {
  particle: string;
  items: ParticleContrastCard["examples"];
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-[color:var(--line)] pt-4">
      <div
        className="text-small font-medium text-[color:var(--fg-soft)]"
        style={{ fontFamily: "var(--font-jp-sans)" }}
      >
        {particle}
      </div>
      {items.map((ex, idx) => (
        <div key={idx} className="flex flex-col gap-0.5">
          <div
            className="text-[15px] leading-[1.7] text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            <RubyText text={ex.jp} />
          </div>
          <div className="text-label text-[color:var(--fg-faint)]">{ex.ko}</div>
        </div>
      ))}
    </div>
  );
}

function GrammarQuiz({
  card,
  seed,
  onResolved,
}: {
  card: GrammarCard;
  seed: number;
  onResolved: (wasCorrect: boolean) => void;
}) {
  // Pick one quiz deterministically per (card, seed).
  const quizIndex = Math.abs(seed) % card.quizzes.length;
  const quiz: GrammarPatternQuiz | ParticleContrastQuiz = card.quizzes[quizIndex];
  const { correct, choices } = generateGrammarQuizChoices(quiz, seed);

  const sentenceSrc = quiz.sentenceRuby ?? quiz.sentence;
  const filledBack = sentenceSrc.replace("＿＿＿", `[[${correct}]]`);

  return (
    <QuizCard
      question={
        <div>
          <div
            className="text-[19px] leading-[1.85] font-medium mb-3"
            style={{
              fontFamily: "var(--font-jp-serif)",
              color: "var(--fg)",
              letterSpacing: "-0.01em",
            }}
          >
            <RubyText text={sentenceSrc} />
          </div>
          <div className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
            {quiz.translation}
          </div>
        </div>
      }
      subtitle="빈칸에 들어갈 말은?"
      input={{
        mode: "choice",
        choices,
        correct,
        choiceFontFamily: "var(--font-jp-sans)",
      }}
      back={
        <div className="flex flex-col gap-3">
          <div
            className="text-[19px] leading-[1.85] font-medium"
            style={{
              fontFamily: "var(--font-jp-serif)",
              color: "var(--fg)",
              letterSpacing: "-0.01em",
            }}
          >
            <RubyText text={filledBack} />
          </div>
          <div className="text-[13px] text-[color:var(--fg-faint)] leading-relaxed">
            {quiz.translation}
          </div>
          {card.type === "pattern" && (
            <div className="mt-2 pt-3 border-t border-[color:var(--line)] text-[13px] text-[color:var(--accent-korean)]">
              {card.koreanStructure}
            </div>
          )}
          {card.type === "particle_contrast" && (
            <div className="mt-2 pt-3 border-t border-[color:var(--line)] text-[13px] text-[color:var(--accent-korean)]">
              {card.rule}
            </div>
          )}
        </div>
      }
      onResolved={onResolved}
      minQuestionHeight={180}
    />
  );
}
