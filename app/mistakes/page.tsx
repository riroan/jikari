"use client";

import { useState } from "react";
import { ChapterQuizDeck } from "@/components/ChapterQuizDeck";
import { ModePageShell } from "@/components/ModePageShell";
import { useCardsStore } from "@/lib/cards-store";
import { useClientNow } from "@/lib/use-is-client";
import { getExpression, getGrammar, getKanji, getSentence, getVocab } from "@/lib/data";
import { groupByRecency, removeMiss, restoreMiss, type Miss } from "@/lib/misses";
import { useMisses } from "@/lib/use-misses";
import type { ChapterMember, ExpressionCard, GrammarCard, KanjiCard, SentenceCard, VocabCard } from "@/lib/types";

type AnyCard = KanjiCard | VocabCard | SentenceCard | GrammarCard | ExpressionCard;
type Resolved = { miss: Miss; member: ChapterMember; card: AnyCard };

function resolve(miss: Miss): Resolved | null {
  const i = miss.key.indexOf(":");
  const mode = miss.key.slice(0, i) as ChapterMember["mode"];
  const rest = miss.key.slice(i + 1);
  const cardId = mode === "grammar" ? rest.replace(/^(pattern|particle):/, "") : rest;
  const card: AnyCard | undefined =
    mode === "kanji" ? getKanji(cardId)
    : mode === "vocab" ? getVocab(cardId)
    : mode === "sentence" ? getSentence(cardId)
    : mode === "grammar" ? getGrammar(cardId)
    : mode === "expression" ? getExpression(cardId)
    : undefined;
  return card ? { miss, member: { chapterId: "mistakes", mode, cardId }, card } : null;
}

/** 앞면은 한국어 힌트 없이, 뒷면은 읽기/뜻. */
function faceBack(c: AnyCard): { front: string; back: string; serif: boolean } {
  if ("expression_jp" in c) return { front: c.expression_jp, back: c.translation_ko, serif: false };
  if ("kanji" in c)
    return {
      front: c.kanji,
      back: `${[...c.onReadings, ...c.kunReadings].join(" · ")} — ${c.koreanSound.join(" ")} ${c.koreanMeaning}`,
      serif: true,
    };
  if ("word" in c) return { front: c.word, back: `${c.reading} — ${c.koreanMeanings.join(", ")}`, serif: false };
  if ("blank" in c) return { front: c.sentence, back: `${c.blank} — ${c.translation}`, serif: false };
  return c.type === "pattern"
    ? { front: c.pattern, back: c.meaningKo, serif: false }
    : { front: c.particles.join(" / "), back: c.rule, serif: false };
}

export default function MistakesPage() {
  const ready = useCardsStore((s) => s.ready);
  const now = useClientNow();
  const misses = useMisses();
  const [run, setRun] = useState<Resolved[] | null>(null);
  const [undo, setUndo] = useState<Miss | null>(null);

  const items = ready ? misses.flatMap((m) => resolve(m) ?? []) : [];

  return (
    <ModePageShell title="誤答" backLabel={run ? "← 목록" : "← HOME"} backHref={run ? "/mistakes" : "/"}>
      {!ready || now === null ? null : run ? (
        <ChapterQuizDeck
          chapterId="mistakes"
          members={run.map(({ member, card }) => ({ member, card }))}
          fixedOrder
        />
      ) : (
        <div className="flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
              {undo ? "" : "틀린 카드가 없어요. 퀴즈에서 틀리면 여기에 모여요."}
            </p>
          ) : (
            <>
              <p className="text-caption text-[color:var(--fg-faint)] tracking-wide">
                {items.length}장 · 연속 2번 맞히면 빠져요
              </p>
              <button
                type="button"
                onClick={() => setRun(items.slice(0, 20))}
                style={{ minHeight: 44 }}
                className="inline-flex items-center justify-center px-4 text-caption tracking-tab border rounded-sm border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)] transition-colors"
              >
                틀린 것만 다시
              </button>
              {groupByRecency(items.map((r) => r.miss), now).map((g) => (
                <section key={g.label}>
                  <h2 className="text-xs tracking-label font-medium text-[color:var(--fg-faint)] mb-1">
                    {g.label}
                  </h2>
                  <ul className="border-t border-[color:var(--line)]">
                    {g.items.map((m) => (
                      <Row
                        key={m.key}
                        r={items.find((r) => r.miss.key === m.key)!}
                        onClear={() => {
                          removeMiss(m.key);
                          setUndo(m);
                        }}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
          {undo && (
            <p role="status" className="flex items-center gap-2 text-caption text-[color:var(--fg-faint)]">
              지웠어요
              <button
                type="button"
                onClick={() => {
                  restoreMiss(undo);
                  setUndo(null);
                }}
                className="inline-flex items-center min-h-11 px-2 underline underline-offset-2 text-[color:var(--fg-soft)]"
              >
                되돌리기
              </button>
            </p>
          )}
        </div>
      )}
    </ModePageShell>
  );
}

function Row({ r, onClear }: { r: Resolved; onClear: () => void }) {
  const [open, setOpen] = useState(false);
  const { front, back, serif } = faceBack(r.card);
  return (
    <li className="border-b border-[color:var(--line)]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{ minHeight: 44 }}
          className="flex-1 min-w-0 flex items-baseline justify-between gap-3 py-2 text-left"
        >
          <span
            lang="ja"
            className="text-body text-[color:var(--fg)] break-words min-w-0"
            style={{ fontFamily: serif ? "var(--font-jp-serif)" : "var(--font-jp-sans)" }}
          >
            {front}
          </span>
          <span className="text-tiny tabular-nums tracking-wide text-[color:var(--fg-faint)] whitespace-nowrap">
            ✕ {r.miss.count}
          </span>
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label={`${front} 지우기`}
          className="inline-flex items-center justify-center min-h-11 min-w-11 px-1 text-caption text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]"
        >
          지우기
        </button>
      </div>
      {open && (
        <p className="pb-3 text-caption leading-relaxed text-[color:var(--accent-progress-text)]">{back}</p>
      )}
    </li>
  );
}
