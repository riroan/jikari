"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConjugationCard } from "@/components/ConjugationCard";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds } from "@/lib/deck";
import type { ConjugationForm, VerbGroup, VocabCard } from "@/lib/types";
import { ALL_CONJUGATION_FORMS, BASIC_FORMS } from "@/lib/types";

type ConjugatableVerb = VocabCard & {
  verbGroup: Exclude<VerbGroup, "not_verb">;
};

function isConjugatable(v: VocabCard): v is ConjugatableVerb {
  return (
    v.verbGroup === "godan" ||
    v.verbGroup === "ichidan" ||
    v.verbGroup === "irregular"
  );
}

/**
 * Hybrid SRS key:
 *   Basic 4 forms (ます/て/た/ない) share one bucket per verb ("basic").
 *   Advanced 6 forms each get their own bucket per verb.
 *
 * Rationale: per-form SRS for basic forms explodes the daily due queue; they're
 * closely related morphologically so holistic "basic conjugation 숙달" is the
 * right unit. Advanced forms stand apart cognitively so each tracks on its own.
 */
function srsCardId(verbId: string, form: ConjugationForm): string {
  return (BASIC_FORMS as readonly ConjugationForm[]).includes(form)
    ? `${verbId}:basic`
    : `${verbId}:${form}`;
}

/** Deterministic random picker from a seeded RNG. */
function pickFromSeed<T>(arr: readonly T[], seed: number): T {
  const idx = Math.abs(seed) % arr.length;
  return arr[idx];
}

export default function ConjugationPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const review = useStore((s) => s.review);
  const vocab = useCardsStore((s) => s.vocab);

  const verbs = useMemo(() => vocab.filter(isConjugatable), [vocab]);
  const verbIds = useMemo(() => verbs.map((v) => v.id), [verbs]);
  const verbById = useMemo(
    () => new Map(verbs.map((v) => [v.id, v])),
    [verbs],
  );

  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const deck = useMemo(
    () => shuffleIds(verbIds, seed + epoch * 7919),
    [seed, epoch, verbIds],
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

  if (!mounted) return <Shell />;
  if (verbs.length === 0) return <Shell><EmptyState /></Shell>;

  const cardId = deck[index] ?? verbIds[0];
  const verb = cardId ? verbById.get(cardId) : undefined;
  if (!verb) return <Shell />;

  // Pick a random form for this showing, deterministically seeded so React
  // re-renders don't shift the answer mid-input.
  const formSeed = seed + index + epoch * 977;
  const form = pickFromSeed(ALL_CONJUGATION_FORMS, formSeed);

  return (
    <Shell>
      <ConjugationCard
        key={`${verb.id}:${form}:${epoch}:${index}`}
        verb={verb}
        form={form}
        onResolved={(wasCorrect) => {
          review("conjugation", srsCardId(verb.id, form), wasCorrect, "typed");
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
            活用
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
        공부할 동사가 아직 없어요.
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
