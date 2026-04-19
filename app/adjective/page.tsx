"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AdjectiveCard } from "@/components/AdjectiveCard";
import { StudyCard } from "@/components/StudyCard";
import { RubyText } from "@/components/Furigana";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds } from "@/lib/deck";
import {
  ADJ_FORM_LABELS_KO,
  ADJ_GROUP_LABELS_JP,
  ADJ_GROUP_LABELS_KO,
  AdjectiveConjugationError,
  conjugateAdj,
} from "@/lib/adjective";
import type { AdjectiveForm, AdjGroup, VocabCard } from "@/lib/types";
import { ADJ_FORMS_FOR } from "@/lib/types";

type StudyMode = "study" | "quiz";

type ConjugatableAdj = VocabCard & {
  adjGroup: Exclude<AdjGroup, "not_adj">;
};

function isConjugatable(v: VocabCard): v is ConjugatableAdj {
  return v.adjGroup === "i_adj" || v.adjGroup === "na_adj";
}

function pickFromSeed<T>(arr: readonly T[], seed: number): T {
  const idx = Math.abs(seed) % arr.length;
  return arr[idx];
}

export default function AdjectivePage() {
  return (
    <Suspense fallback={<Shell />}>
      <AdjectivePageInner />
    </Suspense>
  );
}

function AdjectivePageInner() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const searchParams = useSearchParams();
  const mode: StudyMode =
    searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const vocab = useCardsStore((s) => s.vocab);

  const adjs = useMemo(() => vocab.filter(isConjugatable), [vocab]);
  const adjIds = useMemo(() => adjs.map((v) => v.id), [adjs]);
  const adjById = useMemo(
    () => new Map(adjs.map((v) => [v.id, v])),
    [adjs],
  );

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () => (mode === "study" ? adjIds : shuffleIds(adjIds, seed + epoch * 7919)),
    [mode, seed, epoch, adjIds],
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

  if (!mounted) return <Shell />;
  if (adjs.length === 0) return <Shell><EmptyState /></Shell>;

  const cardId = deck[index] ?? adjIds[0];
  const adj = cardId ? adjById.get(cardId) : undefined;
  if (!adj) return <Shell />;

  if (mode === "study") {
    return (
      <Shell>
        <StudyCard
          body={<AdjectiveStudyBody adj={adj} />}
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      </Shell>
    );
  }

  // Pick a random form applicable to this adjective's group.
  const applicableForms = ADJ_FORMS_FOR[adj.adjGroup];
  const formSeed = seed + index + epoch * 977;
  const form = pickFromSeed(applicableForms, formSeed);

  return (
    <Shell>
      <AdjectiveCard
        key={`${adj.id}:${form}:${epoch}:${index}`}
        adj={adj}
        form={form}
        onResolved={(wasCorrect) => {
          review("adjective", `${adj.id}:${form}`, wasCorrect, "typed");
          advance();
        }}
      />
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
            形容詞
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-5 pt-8 text-[color:var(--fg-soft)]">
      <div
        className="text-[18px] font-medium leading-relaxed"
        style={{ fontFamily: "var(--font-kr-sans)" }}
      >
        공부할 형용사가 아직 없어요.
      </div>
      <div
        className="text-[14px] text-[color:var(--fg-faint)] leading-relaxed"
        style={{ fontFamily: "var(--font-kr-sans)" }}
      >
        단어에 분류가 붙으면 이곳에 나타납니다.
      </div>
      <Link
        href="/vocab"
        className="inline-block mt-4 px-4 py-3 text-[14px] text-center border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
        style={{ fontFamily: "var(--font-kr-sans)" }}
      >
        단어로 가기
      </Link>
    </div>
  );
}

function AdjectiveStudyBody({ adj }: { adj: ConjugatableAdj }) {
  const applicableForms = ADJ_FORMS_FOR[adj.adjGroup];
  const rows = applicableForms.map((form) => {
    let answer: string;
    try {
      answer = conjugateAdj(adj.reading, adj.adjGroup, form);
    } catch (e) {
      answer = e instanceof AdjectiveConjugationError ? "—" : "—";
    }
    return { form, answer };
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <div
          className="text-[64px] leading-none font-semibold"
          style={{
            fontFamily: "var(--font-jp-serif)",
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          {adj.ruby ? <RubyText text={adj.ruby} /> : adj.word}
        </div>
        {!adj.ruby && (
          <div
            className="mt-2 text-[15px] text-[color:var(--fg-faint)]"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            {adj.reading}
          </div>
        )}
        <div className="mt-2 text-[13px] text-[color:var(--fg-faint)]">
          <span style={{ fontFamily: "var(--font-kr-sans)" }}>
            {ADJ_GROUP_LABELS_KO[adj.adjGroup]}
          </span>
          <span className="mx-1.5">·</span>
          <span style={{ fontFamily: "var(--font-jp-sans)" }}>
            {ADJ_GROUP_LABELS_JP[adj.adjGroup]}
          </span>
        </div>
        <div
          className="mt-3 text-[14px] text-[color:var(--fg-soft)] leading-relaxed"
          style={{ fontFamily: "var(--font-kr-sans)" }}
        >
          {adj.koreanMeanings.join(", ")}
        </div>
      </div>

      <div className="flex flex-col gap-px bg-[color:var(--line)] rounded-sm overflow-hidden mt-2">
        {rows.map(({ form, answer }) => (
          <div
            key={form}
            className="flex items-baseline justify-between gap-4 bg-[color:var(--bg)] px-4 py-2.5"
          >
            <span
              className="text-[12px] text-[color:var(--fg-faint)] tracking-[0.15em] font-medium min-w-[72px]"
              style={{ fontFamily: "var(--font-kr-sans)" }}
            >
              {ADJ_FORM_LABELS_KO[form]}
            </span>
            <span
              className="text-[18px] text-[color:var(--fg)] text-right"
              style={{ fontFamily: "var(--font-jp-sans)" }}
            >
              {answer}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
