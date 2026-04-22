"use client";

import { QuizCard } from "@/components/QuizCard";
import { ConjugationCard } from "@/components/ConjugationCard";
import { RubyText } from "@/components/Furigana";
import {
  generateGrammarQuizChoices,
  generateKanjiChoices,
  generateSentenceChoices,
  generateVocabChoices,
} from "@/lib/data";
import { pickMode } from "@/lib/srs";
import { normalizeJapanese } from "@/lib/normalize";
import type {
  ChapterMember,
  GrammarCard,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "@/lib/types";

/**
 * Per-chapter quiz dispatcher. Chapter members span 4 modes:
 *   kanji / vocab / sentence (vocab + particle category) / grammar
 * (conjugation/adjective derive from vocab — chapter_members never references them.)
 *
 * Each mode renders its own quiz UI by reusing the same primitives as the
 * top-level mode pages (QuizCard, ConjugationCard). On answer:
 *   - SRS key is computed mode-appropriately (grammar gets pattern:/particle: prefix)
 *   - parent's onResolved receives (cardKey, wasCorrect, answerMode)
 */

export interface ChapterQuizContext {
  member: ChapterMember;
  card: KanjiCard | VocabCard | SentenceCard | GrammarCard;
  /** Stable per-card seed so question form is consistent within a session. */
  seed: number;
  /** SRS box for this card under its native (subtyped) key. */
  box: 1 | 2 | 3 | 4 | 5;
  /** When ≥ this box, vocab/kanji switch to typed mode. */
  typingThreshold: 2 | 3 | 4 | 5;
  /** Called after feedback. Args: (mode-string-for-srs, srsCardId, wasCorrect, answerMode). */
  onResolved: (
    mode: "kanji" | "vocab" | "sentence" | "grammar",
    srsCardId: string,
    wasCorrect: boolean,
    answerMode: "choice" | "typed",
  ) => void;
}

export function ChapterQuizCard(ctx: ChapterQuizContext) {
  const { member } = ctx;
  switch (member.mode) {
    case "kanji":
      return <KanjiSlot {...ctx} card={ctx.card as KanjiCard} />;
    case "vocab":
      return <VocabSlot {...ctx} card={ctx.card as VocabCard} />;
    case "sentence":
      return <SentenceSlot {...ctx} card={ctx.card as SentenceCard} />;
    case "grammar":
      return <GrammarSlot {...ctx} card={ctx.card as GrammarCard} />;
    default:
      // conjugation/adjective shouldn't appear in chapter_members.
      return null;
  }
}

// ─── KANJI ──────────────────────────────────────────────────────────────────
function KanjiSlot({
  card,
  seed,
  box,
  typingThreshold,
  onResolved,
}: Omit<ChapterQuizContext, "card" | "member"> & { card: KanjiCard }) {
  const answerMode = pickMode(box, typingThreshold);
  const qType: "on" | "kun" =
    card.onReadings.length > 0 && card.kunReadings.length > 0
      ? seed % 2 === 0
        ? "on"
        : "kun"
      : card.onReadings.length > 0
        ? "on"
        : "kun";
  const readings = qType === "on" ? card.onReadings : card.kunReadings;

  const input =
    answerMode === "choice"
      ? (() => {
          const c = generateKanjiChoices(card, qType, seed);
          return {
            mode: "choice" as const,
            choices: c.choices,
            correct: c.correct,
          };
        })()
      : {
          mode: "typed" as const,
          lang: "ja" as const,
          acceptableAnswers: readings.map((r) =>
            normalizeJapanese(r.replace(/[.．]/g, "")),
          ),
        };

  return (
    <QuizCard
      question={
        <div
          className="text-hero leading-none font-semibold"
          style={{
            fontFamily: "var(--font-jp-serif)",
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          {card.kanji}
        </div>
      }
      subtitle={qType === "on" ? "音読み" : "訓読み"}
      input={input}
      onResolved={(correct) => onResolved("kanji", card.id, correct, answerMode)}
    />
  );
}

// ─── VOCAB ──────────────────────────────────────────────────────────────────
function VocabSlot({
  card,
  seed,
  box,
  typingThreshold,
  onResolved,
}: Omit<ChapterQuizContext, "card" | "member"> & { card: VocabCard }) {
  const answerMode = pickMode(box, typingThreshold);
  const input =
    answerMode === "choice"
      ? (() => {
          const c = generateVocabChoices(card, "recognition", seed);
          return {
            mode: "choice" as const,
            choices: c.choices,
            correct: c.correct,
            choiceFontFamily: "var(--font-kr-sans)",
          };
        })()
      : {
          mode: "typed" as const,
          lang: "ko" as const,
          acceptableAnswers: card.koreanMeanings,
        };

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
      input={input}
      onResolved={(correct) => onResolved("vocab", card.id, correct, answerMode)}
      minQuestionHeight={0}
    />
  );
}

// ─── SENTENCE (vocab + particle category) ──────────────────────────────────
function SentenceSlot({
  card,
  seed,
  onResolved,
}: Omit<ChapterQuizContext, "card" | "member"> & { card: SentenceCard }) {
  const choices = generateSentenceChoices(card, seed);
  const isParticle = card.category === "particle";
  return (
    <QuizCard
      question={
        <div>
          <div
            className="text-h2 leading-[1.8] font-medium mb-3"
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
      subtitle={isParticle ? "빈칸에 들어갈 조사는?" : "빈칸에 들어갈 말은?"}
      input={{
        mode: "choice",
        choices: choices.choices,
        correct: choices.correct,
        choiceFontFamily: "var(--font-jp-sans)",
      }}
      onResolved={(correct) =>
        onResolved("sentence", card.id, correct, "choice")
      }
      minQuestionHeight={0}
    />
  );
}

// ─── GRAMMAR (pattern + particle_contrast) ─────────────────────────────────
function GrammarSlot({
  card,
  seed,
  onResolved,
}: Omit<ChapterQuizContext, "card" | "member"> & { card: GrammarCard }) {
  const quizIndex = Math.abs(seed) % card.quizzes.length;
  const quiz = card.quizzes[quizIndex];
  const { correct, choices } = generateGrammarQuizChoices(quiz, seed);
  const sentenceSrc = quiz.sentenceRuby ?? quiz.sentence;
  const subtypedId =
    card.type === "pattern" ? `pattern:${card.id}` : `particle:${card.id}`;

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
      onResolved={(wasCorrect) =>
        onResolved("grammar", subtypedId, wasCorrect, "choice")
      }
      minQuestionHeight={180}
    />
  );
}

// ─── ConjugationCard re-export not needed — chapter_members never references conjugation/adjective.
export { ConjugationCard };
