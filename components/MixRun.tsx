"use client";

import { useMemo, useState } from "react";
import { AdjectiveCard } from "@/components/AdjectiveCard";
import { ChapterQuizCard } from "@/components/ChapterQuizCard";
import { ConjugationCard } from "@/components/ConjugationCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useQuizRun } from "@/lib/use-quiz-run";
import { useStore } from "@/lib/store";
import { answerOf } from "@/lib/quiz-run";
import { adjectiveFormDifficulty, conjugationFormDifficulty, jlptDifficulty, registerDifficulty } from "@/lib/rating";
import { conjugate, FORM_LABELS_KO, srsCardId } from "@/lib/conjugation";
import { ADJ_FORM_LABELS_KO, conjugateAdj } from "@/lib/adjective";
import { MIX_SUBJECTS, mixStateKey, type MixSubject } from "@/lib/mix-deck";
import type {
  AdjectiveForm, ConjugationForm, ExpressionCard, GrammarCard, KanjiCard,
  SentenceCard, VocabCard,
} from "@/lib/types";

type Verb = VocabCard & { verbGroup: "godan" | "ichidan" | "irregular" };
type Adj = VocabCard & { adjGroup: "i_adj" | "na_adj" };
type Plain = KanjiCard | VocabCard | SentenceCard | GrammarCard | ExpressionCard;

export type MixEntry =
  | { key: string; subject: "conjugation"; card: Verb; form: ConjugationForm }
  | { key: string; subject: "adjective"; card: Adj; form: AdjectiveForm }
  | { key: string; subject: Exclude<MixSubject, "conjugation" | "adjective">; card: Plain };

const frontBack = (c: Plain): [string, string] =>
  "expression_jp" in c ? [c.expression_jp, c.translation_ko]
  : "kanji" in c ? [c.kanji, [...c.onReadings, ...c.kunReadings][0] ?? ""]
  : "word" in c ? [c.word, c.koreanMeanings[0] ?? ""]
  : "blank" in c ? [c.sentence, c.blank]
  : c.type === "pattern" ? [c.pattern, c.meaningKo]
  : [c.particles.join(" / "), c.rule];

const ko = (s: MixSubject) => MIX_SUBJECTS.find((m) => m.id === s)!.ko;

/** 종합 퀴즈 한 판. 덱(entries)은 만들어 받고, 여기서는 섞지 않는다. */
export function MixRun({ entries, onExit }: { entries: MixEntry[]; onExit: () => void }) {
  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const typingThreshold = useStore((s) => s.settings.typingThresholdBox);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [tally, setTally] = useState<Partial<Record<MixSubject, [number, number]>>>({});
  const [retried, setRetried] = useState(false);
  const run = useQuizRun(entries.length, entries.length);

  const breakdown = useMemo(
    () =>
      MIX_SUBJECTS.filter((m) => tally[m.id])
        .map((m) => `${m.ko} ${tally[m.id]![0]}/${tally[m.id]![1]}`)
        .join(" · "),
    [tally],
  );

  if (run.summary)
    return (
      <SessionSummary
        summary={run.summary}
        breakdown={retried ? undefined : breakdown}
        onRetry={() => { setRetried(true); run.retryMissed(); }}
        onNext={onExit}
      />
    );

  const e = (run.retryId ? entries.find((x) => x.key === run.retryId) : entries[index]) ?? entries[0];
  if (!e) return null;

  const finish = (ok: boolean, front: string, back: string) => {
    if (!run.retrying) {
      setStats((s) => (ok ? { ...s, correct: s.correct + 1 } : { ...s, wrong: s.wrong + 1 }));
      setTally((t) => {
        const [c, n] = t[e.subject] ?? [0, 0];
        return { ...t, [e.subject]: [c + (ok ? 1 : 0), n + 1] };
      });
      setIndex((i) => i + 1);
    }
    run.record(e.key, ok, front, back);
  };
  const live = !run.retrying;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-caption text-[color:var(--fg-faint)] tracking-label font-medium">
        {run.retrying ? (
          <span>틀린 것 다시</span>
        ) : (
          <>
            <span>{index + 1} / {entries.length} · {ko(e.subject)}</span>
            <span className="tabular-nums">◯ {stats.correct} ・ ✕ {stats.wrong}</span>
          </>
        )}
      </div>

      {e.subject === "conjugation" ? (
        <ConjugationCard
          key={e.key}
          verb={e.card}
          form={e.form}
          onResolved={(ok) => {
            if (live) {
              review("conjugation", srsCardId(e.card.id, e.form), ok, "typed", conjugationFormDifficulty(e.form));
              recordQuizResult("conjugation", ok);
            }
            finish(ok, `${e.card.word} ${FORM_LABELS_KO[e.form]}`, answerOf(() => conjugate(e.card.reading, e.card.verbGroup, e.form)));
          }}
        />
      ) : e.subject === "adjective" ? (
        <AdjectiveCard
          key={e.key}
          adj={e.card}
          form={e.form}
          onResolved={(ok) => {
            if (live) {
              review("adjective", `${e.card.id}:${e.form}`, ok, "typed", adjectiveFormDifficulty(e.form));
              recordQuizResult("adjective", ok);
            }
            finish(ok, `${e.card.word} ${ADJ_FORM_LABELS_KO[e.form]}`, answerOf(() => conjugateAdj(e.card.reading, e.card.adjGroup, e.form)));
          }}
        />
      ) : (
        <ChapterQuizCard
          key={e.key}
          member={{
            chapterId: "mix",
            mode: e.subject === "particle" ? "sentence" : e.subject,
            cardId: e.card.id,
          }}
          card={e.card}
          seed={seed + index}
          box={
            (useStore.getState().learningStates[
              mixStateKey(e.subject, e.card.id, "type" in e.card ? (e.card.type === "pattern" ? "pattern" : "particle") : undefined)
            ]?.box ?? 1) as 1 | 2 | 3 | 4 | 5
          }
          typingThreshold={typingThreshold}
          onResolved={(srsMode, srsId, ok, answerMode) => {
            if (live) {
              const c = e.card;
              review(
                srsMode, srsId, ok, answerMode,
                srsMode === "expression" ? registerDifficulty(c as ExpressionCard)
                  : "jlptLevel" in c ? jlptDifficulty(c) : undefined,
              );
              recordQuizResult(e.subject as "kanji", ok);
            }
            const [f, b] = frontBack(e.card);
            finish(ok, f, b);
          }}
        />
      )}
    </div>
  );
}
