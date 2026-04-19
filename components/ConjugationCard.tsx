"use client";

import { RubyText } from "./Furigana";
import { TypedChallengeCard } from "./TypedChallengeCard";
import {
  conjugateAll,
  ConjugationError,
  FORM_LABELS_JP,
  FORM_LABELS_KO,
  GROUP_LABELS_JP,
  GROUP_LABELS_KO,
} from "@/lib/conjugation";
import type { ConjugationForm, VerbGroup, VocabCard } from "@/lib/types";

export interface ConjugationCardProps {
  verb: VocabCard & { verbGroup: Exclude<VerbGroup, "not_verb"> };
  form: ConjugationForm;
  onResolved: (wasCorrect: boolean) => void;
}

export function ConjugationCard({
  verb,
  form,
  onResolved,
}: ConjugationCardProps) {
  let acceptableAnswers: string[];
  try {
    acceptableAnswers = conjugateAll(
      verb.word,
      verb.reading,
      verb.verbGroup,
      form,
    );
  } catch (e) {
    if (e instanceof ConjugationError) {
      console.error(
        `[ConjugationCard] ${e.message} — verb ${verb.word} (${verb.verbGroup})`,
      );
    }
    acceptableAnswers = [];
  }

  return (
    <TypedChallengeCard
      acceptableAnswers={acceptableAnswers}
      categoryLabel="活用"
      formLabelKo={FORM_LABELS_KO[form]}
      formLabelJp={FORM_LABELS_JP[form]}
      hero={verb.ruby ? <RubyText text={verb.ruby} /> : verb.word}
      heroFontSizePx={96}
      groupLabelKo={GROUP_LABELS_KO[verb.verbGroup]}
      groupLabelJp={GROUP_LABELS_JP[verb.verbGroup]}
      onResolved={onResolved}
    />
  );
}
