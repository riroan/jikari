"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MixRun, type MixEntry } from "@/components/MixRun";
import { ModePageShell } from "@/components/ModePageShell";
import { useStore } from "@/lib/store";
import { useCardsStore } from "@/lib/cards-store";
import { useIsClient } from "@/lib/use-is-client";
import { getExpression, getGrammar, getKanji, getSentence, getVocab } from "@/lib/data";
import { buildReviewDeck } from "@/lib/review-deck";
import { ADJ_FORMS_FOR, ALL_CONJUGATION_FORMS, BASIC_FORMS } from "@/lib/types";
import type { AdjectiveForm, ConjugationForm, VocabCard } from "@/lib/types";

type Verb = VocabCard & { verbGroup: "godan" | "ichidan" | "irregular" };
type Adj = VocabCard & { adjGroup: "i_adj" | "na_adj" };

export default function ReviewPage() {
  const mounted = useIsClient();
  const ready = useCardsStore((s) => s.ready);
  return (
    <ModePageShell title="復習">
      {mounted && ready ? <Session /> : null}
    </ModePageShell>
  );
}

/** `verbId:suffix` → 카드 id와 접미. 활용/형용사 상태 키 형식이다. */
const split = (cardId: string): [string, string] => {
  const i = cardId.lastIndexOf(":");
  return [cardId.slice(0, i), cardId.slice(i + 1)];
};

/** 덱은 한 번만 뽑는다 — 답할 때마다 due가 줄어도 순서가 흔들리지 않게. */
function buildEntries(): MixEntry[] {
  const cs = useCardsStore.getState();
  const sentences = new Set(cs.sentenceIds);
  const particles = new Set(cs.particleIds);
  const verb = (id: string) => {
    const v = cs.vocabById.get(id);
    return v && (v.verbGroup === "godan" || v.verbGroup === "ichidan" || v.verbGroup === "irregular")
      ? (v as Verb) : undefined;
  };
  const adj = (id: string) => {
    const v = cs.vocabById.get(id);
    return v && (v.adjGroup === "i_adj" || v.adjGroup === "na_adj") ? (v as Adj) : undefined;
  };
  const formOf = (suffix: string, i: number): ConjugationForm | undefined =>
    suffix === "basic" ? BASIC_FORMS[i % BASIC_FORMS.length]
    : ALL_CONJUGATION_FORMS.find((f) => f === suffix);

  const out: MixEntry[] = [];
  buildReviewDeck(
    useStore.getState().learningStates,
    Date.now(),
    (m, id) => {
      switch (m) {
        case "sentence": return sentences.has(id) && !!getSentence(id);
        case "particle": return particles.has(id) && !!getSentence(id);
        case "kanji": return !!getKanji(id);
        case "vocab": return !!getVocab(id);
        case "grammar": return !!getGrammar(id);
        case "expression": return !!getExpression(id);
        case "conjugation": { const [v, f] = split(id); return !!verb(v) && !!formOf(f, 0); }
        case "adjective": {
          const [v, f] = split(id);
          const a = adj(v);
          return !!a && (ADJ_FORMS_FOR[a.adjGroup] as readonly string[]).includes(f);
        }
      }
    },
    useStore.getState().settings.dailyGoal,
  ).forEach(({ mode, cardId }, i) => {
    const key = `${mode}:${cardId}`;
    if (mode === "conjugation") {
      const [v, f] = split(cardId);
      out.push({ key, subject: mode, card: verb(v)!, form: formOf(f, i)! });
    } else if (mode === "adjective") {
      const [v, f] = split(cardId);
      out.push({ key, subject: mode, card: adj(v)!, form: f as AdjectiveForm });
    } else if (mode === "kanji") out.push({ key, subject: mode, card: getKanji(cardId)! });
    else if (mode === "vocab") out.push({ key, subject: mode, card: getVocab(cardId)! });
    else if (mode === "grammar") out.push({ key, subject: mode, card: getGrammar(cardId)! });
    else if (mode === "expression") out.push({ key, subject: mode, card: getExpression(cardId)! });
    else out.push({ key, subject: mode, card: getSentence(cardId)! });
  });
  return out;
}

function Session() {
  const router = useRouter();
  // "계속하기"를 누르면 남은 due로 새 덱을 뽑는다.
  const [round, setRound] = useState(0);
  const [entries, setEntries] = useState(buildEntries);

  if (entries.length === 0) {
    return (
      <div className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
        오늘 복습할 카드가 없어요. 공부나 퀴즈를 풀면 여기에 쌓여요.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <MixRun
        key={round}
        entries={entries}
        onExit={() => {
          const next = buildEntries();
          if (next.length === 0) return router.push("/");
          setEntries(next);
          setRound((r) => r + 1);
        }}
      />
    </div>
  );
}
