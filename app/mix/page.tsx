"use client";

import { useState } from "react";
import { MixRun, type MixEntry } from "@/components/MixRun";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { useIsClient } from "@/lib/use-is-client";
import { getExpression, getGrammar, getKanji, getSentence, getVocab } from "@/lib/data";
import { pickByDifficulty } from "@/lib/deck";
import {
  adjectiveFormDifficulty, conjugationFormDifficulty, INITIAL_RATING, quantizeRating,
} from "@/lib/rating";
import { ADJ_FORMS_FOR, ALL_CONJUGATION_FORMS } from "@/lib/types";
import {
  buildMixDeck, MIX_LENGTHS, MIX_SUBJECTS, mixStateKey, weakWeight,
  type MixSubject,
} from "@/lib/mix-deck";
import type { LearningState, VocabCard } from "@/lib/types";

interface Config {
  subjects: MixSubject[];
  length: number;
  weakFirst: boolean;
}

export default function MixPage() {
  const mounted = useIsClient();
  const ready = useCardsStore((s) => s.ready);
  return (
    <ModePageShell title="混合">
      {mounted && ready ? <Mix /> : null}
    </ModePageShell>
  );
}

function Mix() {
  const [config, setConfig] = useState<Config | null>(null);
  const [entries, setEntries] = useState<MixEntry[]>([]);
  if (config && entries.length > 0)
    return <MixRun entries={entries} onExit={() => { setConfig(null); setEntries([]); }} />;
  return (
    <Start
      initial={config}
      onStart={(c) => {
        const e = buildEntries(c);
        setConfig(c);
        setEntries(e);
        return e.length > 0;
      }}
    />
  );
}

/** 덱은 시작할 때 한 번만 만든다 — 풀면서 학습 상태가 바뀌어도 순서가 흔들리지 않게. */
function buildEntries(c: Config): MixEntry[] {
  const cs = useCardsStore.getState();
  const { learningStates: states, ratings } = useStore.getState();
  const seed = Math.floor(Math.random() * 1_000_000);

  const verbs = cs.vocab.filter((v) => v.verbGroup === "godan" || v.verbGroup === "ichidan" || v.verbGroup === "irregular");
  const adjs = cs.vocab.filter((v) => v.adjGroup === "i_adj" || v.adjGroup === "na_adj");
  // 활용/형용사는 형마다 상태가 따로라, 카드 하나의 약함 = 그 카드 상태 중 가장 약한 것.
  const weakest = new Map<string, LearningState>();
  const seen = new Map<string, number>();
  for (const s of Object.values(states)) {
    if (s.mode !== "conjugation" && s.mode !== "adjective") continue;
    const k = `${s.mode}:${s.cardId.slice(0, s.cardId.lastIndexOf(":"))}`;
    if (s.lastReviewed > 0) seen.set(k, (seen.get(k) ?? 0) + 1);
    const prev = weakest.get(k);
    if (!prev || weakWeight(s) > weakWeight(prev)) weakest.set(k, s);
  }
  const grammarSub = (id: string) => (cs.grammarById.get(id)?.type === "pattern" ? "pattern" : "particle");
  const weight = (s: MixSubject, id: string) => {
    if (s === "conjugation" || s === "adjective") {
      const k = `${s}:${id}`;
      const g = cs.vocabById.get(id)?.adjGroup;
      const forms = s === "conjugation" ? ALL_CONJUGATION_FORMS.length : g === "i_adj" || g === "na_adj" ? ADJ_FORMS_FOR[g].length : 0;
      // 안 본 형이 남아 있으면 안 본 것이 가장 약한 것으로 친다.
      return (seen.get(k) ?? 0) < forms ? weakWeight(undefined) : weakWeight(weakest.get(k));
    }
    return weakWeight(states[mixStateKey(s, id, s === "grammar" ? grammarSub(id) : undefined)]);
  };

  const items = buildMixDeck({
    pools: {
      kanji: cs.kanjiIds,
      vocab: cs.vocabIds,
      sentence: cs.sentenceIds,
      particle: cs.particleIds,
      conjugation: verbs.map((v) => v.id),
      adjective: adjs.map((v) => v.id),
      grammar: cs.grammar.map((g) => g.id),
      expression: cs.expressionIds,
    },
    subjects: c.subjects,
    length: c.length,
    seed,
    weight: c.weakFirst ? weight : undefined,
  });

  const conjTier = quantizeRating(ratings.conjugation ?? INITIAL_RATING);
  const adjTier = quantizeRating(ratings.adjective ?? INITIAL_RATING);
  const out: MixEntry[] = [];
  items.forEach(({ subject, id }, i) => {
    const key = `${subject}:${id}`;
    switch (subject) {
      case "kanji": { const card = getKanji(id); if (card) out.push({ key, subject, card }); break; }
      case "vocab": { const card = getVocab(id); if (card) out.push({ key, subject, card }); break; }
      case "sentence":
      case "particle": { const card = getSentence(id); if (card) out.push({ key, subject, card }); break; }
      case "grammar": { const card = getGrammar(id); if (card) out.push({ key, subject, card }); break; }
      case "expression": { const card = getExpression(id); if (card) out.push({ key, subject, card }); break; }
      case "conjugation": {
        const card = cs.vocabById.get(id) as (VocabCard & { verbGroup: "godan" | "ichidan" | "irregular" }) | undefined;
        if (card) out.push({ key, subject, card, form: pickByDifficulty(ALL_CONJUGATION_FORMS, conjugationFormDifficulty, conjTier, seed + i) });
        break;
      }
      case "adjective": {
        const card = cs.vocabById.get(id) as (VocabCard & { adjGroup: "i_adj" | "na_adj" }) | undefined;
        if (card) out.push({ key, subject, card, form: pickByDifficulty(ADJ_FORMS_FOR[card.adjGroup], adjectiveFormDifficulty, adjTier, seed + i) });
        break;
      }
    }
  });
  return out;
}

const chip =
  "inline-flex items-center justify-center min-h-[44px] px-3 text-caption tracking-wide border rounded-sm transition-colors";

function Start({ initial, onStart }: { initial: Config | null; onStart: (c: Config) => boolean }) {
  const [subjects, setSubjects] = useState<MixSubject[]>(initial?.subjects ?? MIX_SUBJECTS.map((m) => m.id));
  const [length, setLength] = useState(initial?.length ?? 20);
  const [weakFirst, setWeakFirst] = useState(initial?.weakFirst ?? true);
  const [empty, setEmpty] = useState(false);

  const toggle = (id: MixSubject) =>
    setSubjects((cur) =>
      cur.includes(id) ? (cur.length > 1 ? cur.filter((s) => s !== id) : cur) : [...cur, id],
    );
  const on = "border-[color:var(--fg)] text-[color:var(--fg)]";
  const off = "border-[color:var(--line)] text-[color:var(--fg-faint)]";

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="mix-subjects">
        <h2 id="mix-subjects" className="text-xs tracking-label font-medium text-[color:var(--fg-faint)] mb-2">
          과목
        </h2>
        <div className="flex flex-wrap gap-2">
          {MIX_SUBJECTS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={subjects.includes(m.id)}
              onClick={() => toggle(m.id)}
              className={`${chip} ${subjects.includes(m.id) ? on : off}`}
            >
              {m.ko}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="mix-length">
        <h2 id="mix-length" className="text-xs tracking-label font-medium text-[color:var(--fg-faint)] mb-2">
          문제 수
        </h2>
        <div className="flex gap-2" role="group" aria-labelledby="mix-length">
          {MIX_LENGTHS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={length === n}
              onClick={() => setLength(n)}
              className={`${chip} min-w-[56px] tabular-nums ${length === n ? on : off}`}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        aria-pressed={weakFirst}
        onClick={() => setWeakFirst((w) => !w)}
        className="flex items-center justify-between gap-3 min-h-[44px] border-t border-b border-[color:var(--line)] py-2 text-left"
      >
        <span>
          <span className="block text-body text-[color:var(--fg)]">약한 것 먼저</span>
          <span className="block text-caption text-[color:var(--fg-faint)]">
            못 맞힌 카드와 낮은 단계 위주로 골라요
          </span>
        </span>
        <span className={`text-caption tracking-wide ${weakFirst ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}>
          {weakFirst ? "켜짐" : "꺼짐"}
        </span>
      </button>

      <div>
        <button
          type="button"
          onClick={() => {
            setEmpty(!onStart({ subjects, length, weakFirst }));
          }}
          className="w-full min-h-[56px] bg-[color:var(--accent-progress)] text-[color:var(--on-progress)] rounded-sm text-body font-semibold active:opacity-80 transition-opacity"
        >
          시작
        </button>
        {empty && (
          <p role="status" className="mt-2 text-caption text-[color:var(--fg-faint)]">
            고른 과목에 카드가 없어요.
          </p>
        )}
      </div>
    </div>
  );
}
