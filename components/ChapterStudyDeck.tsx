"use client";

import { useMemo, useState } from "react";
import { StudyCard } from "@/components/StudyCard";
import { RubyText } from "@/components/Furigana";
import { ExpressionBack } from "@/components/ExpressionParts";
import { SpeakButton } from "@/components/SpeakButton";
import { useCardsStore } from "@/lib/cards-store";
import { findExamples, getExampleIndex } from "@/lib/examples";
import type {
  ChapterMember,
  ExpressionCard,
  GrammarCard,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "@/lib/types";

type AnyCard = KanjiCard | VocabCard | SentenceCard | GrammarCard | ExpressionCard;
const BLANK = "＿＿＿";

/**
 * /chapters/[id]?mode=study body — read-only walk through the chapter's cards.
 * Never touches SRS (no store writes). Bodies are deliberately simpler than the
 * per-mode study pages (those live inside page.tsx and can't be imported).
 */
export function ChapterStudyDeck({
  members,
}: {
  members: Array<{ member: ChapterMember; card: AnyCard }>;
}) {
  const [i, setI] = useState(0);
  const n = members.length;
  if (n === 0) return null;
  const { member, card } = members[i % n];
  const step = (d: number) => setI((x) => (x + d + n) % n);

  return (
    <StudyCard
      key={`${member.mode}:${member.cardId}`}
      body={<Body mode={member.mode} card={card} />}
      speak={speakText(member.mode, card)}
      position={(i % n) + 1}
      total={n}
      onPrev={() => step(-1)}
      onNext={() => step(1)}
    />
  );
}

function speakText(mode: string, card: AnyCard): string | undefined {
  if (mode === "vocab") return (card as VocabCard).word;
  if (mode === "sentence") {
    const s = card as SentenceCard;
    return s.sentence.replace(BLANK, s.blank);
  }
  if (mode === "expression") {
    const e = card as ExpressionCard;
    return e.ruby ?? e.expression_jp;
  }
  return undefined;
}

function Body({ mode, card }: { mode: string; card: AnyCard }) {
  switch (mode) {
    case "kanji": {
      const k = card as KanjiCard;
      return (
        <div className="flex flex-col gap-4" style={{ fontFamily: "var(--font-jp-sans)" }}>
          <div
            lang="ja"
            className="text-hero leading-none font-semibold text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)", letterSpacing: "-0.02em" }}
          >
            {k.kanji}
          </div>
          <div className="text-body text-[color:var(--fg-soft)]">
            {k.onReadings.length > 0 && <div>音 {k.onReadings.join(" ・ ")}</div>}
            {k.kunReadings.length > 0 && <div>訓 {k.kunReadings.join(" ・ ")}</div>}
          </div>
          <div className="pt-2 border-t border-dashed border-[color:var(--line)] text-small text-[color:var(--fg-soft)]">
            <span
              className="mr-2.5 text-xs font-semibold text-[color:var(--accent-korean)]"
              style={{ fontFamily: "var(--font-jp-serif)" }}
            >
              韓
            </span>
            {k.koreanMeaning} {k.koreanSound.join("·")}
          </div>
        </div>
      );
    }
    case "vocab":
      return <VocabBody card={card as VocabCard} />;
    case "sentence": {
      const s = card as SentenceCard;
      const [before, after] = (s.sentenceRuby ?? s.sentence).split(BLANK);
      const hasRuby = Boolean(s.sentenceRuby);
      const ans = s.blankRuby ?? s.blank;
      const r = (t: string) => (hasRuby ? <RubyText text={t} /> : t);
      return (
        <div className="flex flex-col gap-4">
          <div
            lang="ja"
            className="text-h2 leading-[1.8] font-medium text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)", letterSpacing: "-0.01em" }}
          >
            {r(before ?? "")}
            <span className="text-[color:var(--accent-progress-text)] font-semibold">
              {hasRuby ? <RubyText text={ans} /> : ans}
            </span>
            {after !== undefined && r(after)}
          </div>
          <div className="text-small text-[color:var(--fg-soft)] leading-relaxed">
            {s.translation}
          </div>
        </div>
      );
    }
    case "grammar": {
      const g = card as GrammarCard;
      const isPattern = g.type === "pattern";
      return (
        <div className="flex flex-col gap-5">
          <div
            lang="ja"
            className="text-[32px] font-semibold leading-[1.3] text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            {isPattern ? <RubyText text={g.pattern} /> : `${g.particles[0]} vs ${g.particles[1]}`}
          </div>
          <div className="text-body text-[color:var(--accent-korean)] font-medium leading-relaxed">
            {isPattern ? g.koreanStructure : g.rule}
          </div>
          {isPattern && (
            <div className="text-meta text-[color:var(--fg-soft)]">{g.meaningKo}</div>
          )}
          <ul className="border-t border-[color:var(--line)]">
            {g.examples.slice(0, 2).map((ex, idx) => (
              <li key={idx} className="py-3 border-b border-[color:var(--line)] flex flex-col gap-1">
                <span
                  lang="ja"
                  className="text-[16px] leading-[1.8] text-[color:var(--fg)]"
                  style={{ fontFamily: "var(--font-jp-serif)" }}
                >
                  <RubyText text={ex.jp} />
                </span>
                <span className="text-caption text-[color:var(--fg-faint)]">{ex.ko}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "expression":
      return <ExpressionBack card={card as ExpressionCard} />;
    default:
      return null;
  }
}

function VocabBody({ card }: { card: VocabCard }) {
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  const examples = useMemo(
    () => findExamples(card, getExampleIndex(sentences, expressions)),
    [card, sentences, expressions],
  );
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div
          lang="ja"
          className="text-[56px] leading-tight font-semibold text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-jp-serif)", letterSpacing: "-0.02em" }}
        >
          {card.ruby ? <RubyText text={card.ruby} /> : card.word}
        </div>
        {!card.ruby && (
          <div
            lang="ja"
            className="text-[16px] text-[color:var(--fg-faint)]"
            style={{ fontFamily: "var(--font-jp-sans)" }}
          >
            {card.reading}
          </div>
        )}
        <div className="text-em text-[color:var(--fg)] leading-relaxed font-medium mt-1">
          {card.koreanMeanings.join(", ")}
        </div>
      </div>
      {examples.length > 0 && (
        <ul className="border-t border-[color:var(--line)]">
          {examples.map((ex, i) => (
            <li
              key={`${ex.plain}:${i}`}
              className="flex items-center gap-2 py-3 border-b border-[color:var(--line)]"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span
                  lang="ja"
                  className="text-[18px] leading-loose text-[color:var(--fg)]"
                  style={{ fontFamily: "var(--font-jp-sans)" }}
                >
                  <RubyText text={ex.ruby} />
                </span>
                <span className="text-small text-[color:var(--fg-soft)]">{ex.ko}</span>
              </div>
              <SpeakButton text={ex.plain} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
