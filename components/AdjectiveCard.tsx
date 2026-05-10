"use client";

import { RubyText } from "./Furigana";
import { TypedChallengeCard } from "./TypedChallengeCard";
import {
  ADJ_FORM_LABELS_JP,
  ADJ_FORM_LABELS_KO,
  ADJ_GROUP_LABELS_JP,
  ADJ_GROUP_LABELS_KO,
  AdjectiveConjugationError,
  conjugateAdjAll,
} from "@/lib/adjective";
import type { AdjectiveForm, AdjGroup, VocabCard } from "@/lib/types";

export interface AdjectiveCardProps {
  adj: VocabCard & { adjGroup: Exclude<AdjGroup, "not_adj"> };
  form: AdjectiveForm;
  onResolved: (wasCorrect: boolean) => void;
}

export function AdjectiveCard({ adj, form, onResolved }: AdjectiveCardProps) {
  let acceptableAnswers: string[];
  try {
    acceptableAnswers = conjugateAdjAll(
      adj.word,
      adj.reading,
      adj.adjGroup,
      form,
    );
  } catch (e) {
    // Known: this adj/form combination has no valid output. Log + render
    // an empty quiz so the page survives. Anything else is a real bug —
    // surface it instead of swallowing.
    if (!(e instanceof AdjectiveConjugationError)) throw e;
    console.error(
      `[AdjectiveCard] ${e.message} — adj ${adj.word} (${adj.adjGroup})`,
    );
    acceptableAnswers = [];
  }

  return (
    <TypedChallengeCard
      acceptableAnswers={acceptableAnswers}
      categoryLabel="形容詞"
      formLabelKo={ADJ_FORM_LABELS_KO[form]}
      formLabelJp={ADJ_FORM_LABELS_JP[form]}
      hero={adj.ruby ? <RubyText text={adj.ruby} /> : adj.word}
      heroFontSizePx={84}
      groupLabelKo={ADJ_GROUP_LABELS_KO[adj.adjGroup]}
      groupLabelJp={ADJ_GROUP_LABELS_JP[adj.adjGroup]}
      onResolved={onResolved}
    />
  );
}
