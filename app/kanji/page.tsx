"use client";

import { Suspense, useMemo, useState } from "react";
import { useIsClient } from "@/lib/use-is-client";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { StudyCard } from "@/components/StudyCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { useStore } from "@/lib/store";
import { WeakEmptyNotice, WeakKey } from "@/components/WeakKey";
import { useWeakIds } from "@/lib/use-weak-ids";
import { SessionSummary } from "@/components/SessionSummary";
import { useQuizRun } from "@/lib/use-quiz-run";
import { SinoKoreanHint } from "@/components/SinoKoreanHint";
import { generateKanjiChoices, getKanji } from "@/lib/data";
import { useCardsStore } from "@/lib/cards-store";
import { shuffleIds, weightedShuffleIds } from "@/lib/deck";
import { INITIAL_RATING, expectedScore, jlptDifficulty, quantizeRating } from "@/lib/rating";
import { pickMode } from "@/lib/srs";
import { preferredFor, settleConfusion } from "@/lib/confusion";
import { normalizeJapanese } from "@/lib/normalize";
import { wordsWithKanji } from "@/lib/kanji-words";
import { useKanjiMissExample } from "@/lib/use-miss-example";
import type { KanjiCard, VocabCard } from "@/lib/types";
import { splitOkurigana } from "@/lib/joyo";
import { speak } from "@/lib/tts";

type StudyMode = "study" | "quiz";

type QType = "on" | "kun";

export default function KanjiPage() {
  return (
    <Suspense fallback={<Shell />}>
      <WeakKey>
        <KanjiPageInner />
      </WeakKey>
    </Suspense>
  );
}

function KanjiPageInner() {
  const mounted = useIsClient();

  const searchParams = useSearchParams();
  const mode: StudyMode = searchParams.get("mode") === "study" ? "study" : "quiz";

  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  const getBox = useStore((s) => s.getBox);
  const threshold = useStore((s) => s.settings.typingThresholdBox);
  const kanjiIds = useCardsStore((s) => s.kanjiIds);
  const kanjiById = useCardsStore((s) => s.kanjiById);
  const rating = useStore((s) => s.ratings.kanji ?? INITIAL_RATING);
  const ratingTier = quantizeRating(rating);

  // Quiz: SRS-weighted shuffle. Study: plain random shuffle (stable per epoch).
  const [epoch, setEpoch] = useState(0);
  const [index, setIndex] = useState(0);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const [weakIds, emptyWeak] = useWeakIds("kanji", kanjiIds);
  const deck = useMemo(
    () =>
      weakIds
        ? shuffleIds(weakIds, seed + epoch * 7919)
        : mode === "study"
        ? shuffleIds(kanjiIds, seed + epoch * 7919)
        : weightedShuffleIds(
            kanjiIds,
            (id) => getBox("kanji", id),
            seed + epoch * 7919,
            {
              difficultyOf: (id) => jlptDifficulty(kanjiById.get(id)),
              rating: ratingTier,
            },
          ),
    // ratingTier, not rating: re-sample once the rating has actually moved.
    [weakIds, mode, seed, epoch, kanjiIds, kanjiById, getBox, ratingTier]
  );

  const run = useQuizRun(deck.length);

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

  if (!mounted) {
    return <Shell />;
  }

  if (kanjiIds.length === 0) {
    return (
      <Shell>
        <EmptyState />
      </Shell>
    );
  }

  // index % length: the deck is re-sampled when the rating tier moves, so it
  // can shrink under a mid-deck index. Wrap instead of falling off the end.
  if (run.summary)
    return (
      <Shell>
        <SessionSummary
          summary={run.summary}
          onRetry={run.retryMissed}
          onNext={run.next}
        />
      </Shell>
    );
  const cardId = run.retryId ?? deck[index % deck.length] ?? kanjiIds[0];
  const card: KanjiCard | undefined = getKanji(cardId);
  if (!card) {
    return <Shell />;
  }

  return (
    <Shell>
      {emptyWeak && <WeakEmptyNotice />}
      {mode === "study" ? (
        <StudyCard
          key="study"
          body={<KanjiStudyBody key={card.id} card={card} />}
          grade={{ mode: "kanji", cardId: card.id, difficulty: jlptDifficulty(card) }}
          hideable
          position={index + 1}
          total={deck.length}
          onPrev={retreat}
          onNext={advance}
        />
      ) : (
        <KanjiQuiz
          card={card}
          seed={seed + index + epoch * 977}
          answerMode={pickMode(getBox("kanji", card.id), threshold)}
          expected={expectedScore(ratingTier, jlptDifficulty(card))}
          onResolved={(wasCorrect, answerMode) => {
            if (!run.retrying) {
              review(
                "kanji",
                card.id,
                wasCorrect,
                answerMode,
                jlptDifficulty(card),
              );
              recordQuizResult("kanji", wasCorrect);
            }
            run.record(card.id, wasCorrect, card.kanji, `${card.koreanMeaning} · ${card.onReadings[0] ?? card.kunReadings[0] ?? ""}`);
            if (!run.retrying) advance();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <ModePageShell statKey="kanji" dueKey="kanji" title="漢字">
      {children}
    </ModePageShell>
  );
}

function EmptyState() {
  return (
    <EmptyCardsState
      label="한자 카드가 아직 없어요."
      hint="scripts/add-kanji.ts로 시드 필요"
    />
  );
}

function KanjiQuiz({
  card,
  seed,
  answerMode,
  expected,
  onResolved,
}: {
  card: KanjiCard;
  seed: number;
  answerMode: "choice" | "typed";
  /** 이 카드를 맞힐 기대 확률 — 선지의 닮은 정도를 조절한다. */
  expected: number;
  onResolved: (correct: boolean, mode: "choice" | "typed") => void;
}) {
  const missExample = useKanjiMissExample(card);
  // 전에 고른 오답을 선지에 다시 올린다 (카드가 바뀔 때만 읽음).
  const prefer = useMemo(() => preferredFor(`kanji:${card.id}`), [card.id]);
  const qType: QType =
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
          const choices = generateKanjiChoices(card, qType, seed, expected, prefer);
          return {
            mode: "choice" as const,
            choices: choices.choices,
            correct: choices.correct,
          };
        })()
      : {
          mode: "typed" as const,
          lang: "ja" as const,
          // Pre-normalize to hiragana so comparison is deterministic.
          // Okurigana in kun readings (e.g., "たべ.る") keep dot form — strip for answer set.
          acceptableAnswers: readings.map((r) =>
            normalizeJapanese(r.replace(/[.．]/g, "")),
          ),
        };

  return (
    <QuizCard
      memoKey={`kanji:${card.id}`}
      missExample={missExample}
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
      back={<KanjiBack card={card} />}
      onResolved={(correct, wrongPick) => {
        settleConfusion(`kanji:${card.id}`, correct, wrongPick);
        onResolved(correct, answerMode);
      }}
      minQuestionHeight={320}
    />
  );
}

function KanjiStudyBody({ card }: { card: KanjiCard }) {
  // 공부 화면: 큰 한자 → 훈음 → 음독/훈독 칩 → 예시 단어(3개씩 넘김). 답에 해당하는 곳은
  // data-answer로 표시해 "답 가리기"(StudyCard)에서 흐려진다.
  const vocab = useCardsStore((s) => s.vocab);
  const words = wordsWithKanji(card.kanji, vocab, 30);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 pt-2">
        <div
          lang="ja"
          className="text-[96px] leading-none font-semibold text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-jp-serif)" }}
        >
          {card.kanji}
        </div>
        <div data-answer className="mt-2 text-body text-[color:var(--fg-soft)]">
          {card.koreanMeaning} {card.koreanSound.join("·")}
        </div>
      </div>
      <div data-answer className="flex flex-col gap-2">
        <ReadingChips label="음독" kanji={card.kanji} readings={card.onReadings} />
        <ReadingChips label="훈독" kanji={card.kanji} readings={card.kunReadings} okurigana />
        <SinoKoreanHint koreanSound={card.koreanSound} onReadings={card.onReadings} />
      </div>
      {words.length > 0 && <WordPager words={words} />}
    </div>
  );
}

/** 음독/훈독 한 줄: 작은 라벨 칩 + 읽기. 훈독의 오쿠리가나(かた「る」)는 흐리게. */
function ReadingChips({
  label,
  kanji,
  readings,
  okurigana = false,
}: {
  label: string;
  kanji: string;
  readings: readonly string[];
  okurigana?: boolean;
}) {
  if (readings.length === 0) return null;
  return (
    <div className="flex items-baseline gap-3">
      <span className="shrink-0 px-1.5 py-0.5 rounded-sm border border-[color:var(--line)] bg-[color:var(--bg-deep)] text-tiny text-[color:var(--fg-faint)]">
        {label}
      </span>
      <span lang="ja" className="text-body text-[color:var(--fg)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
        {readings.map((r, i) => {
          const [stem, okuri] = okurigana ? splitOkurigana(kanji, r) : [r, ""];
          return (
            <span key={r}>
              {i > 0 && <span className="text-[color:var(--fg-faint)]">, </span>}
              {stem}
              {okuri && <span className="text-[color:var(--fg-faint)]">{okuri}</span>}
            </span>
          );
        })}
      </span>
    </div>
  );
}

const WORDS_PER_PAGE = 3;

/** 예시 단어: JLPT 배지 · 단어 · 읽기 · 뜻. 3개씩 넘겨 보고, 줄을 누르면 발음한다. */
function WordPager({ words }: { words: readonly VocabCard[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(words.length / WORDS_PER_PAGE);
  const shown = words.slice(page * WORDS_PER_PAGE, page * WORDS_PER_PAGE + WORDS_PER_PAGE);
  const arrow =
    "inline-flex items-center justify-center min-w-[44px] min-h-[36px] text-[color:var(--fg-soft)] disabled:opacity-30";
  return (
    <div className="border border-[color:var(--line)] rounded-sm">
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 border-b border-[color:var(--line)]">
          <button type="button" className={arrow} aria-label="이전 단어" disabled={page === 0} onClick={(e) => { e.stopPropagation(); setPage(page - 1); }}>
            ‹
          </button>
          <span className="text-caption tabular-nums text-[color:var(--fg-soft)]">
            {page + 1} / {pages}
          </span>
          <button type="button" className={arrow} aria-label="다음 단어" disabled={page >= pages - 1} onClick={(e) => { e.stopPropagation(); setPage(page + 1); }}>
            ›
          </button>
        </div>
      )}
      <ul className="m-0 p-0 list-none">
        {shown.map((w) => (
          <li key={w.id} className="border-b last:border-b-0 border-[color:var(--line)]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                speak(w.reading);
              }}
              aria-label={`${w.word} 발음 듣기`}
              className="w-full min-h-[48px] px-3 py-2 flex items-center gap-3 text-left hover:bg-[color:var(--bg-deep)] transition-colors"
            >
              <span
                className={`shrink-0 w-8 text-center px-1 py-0.5 rounded-sm border text-tiny tabular-nums ${
                  w.jlptLevel >= 4
                    ? "border-[color:var(--accent-progress)] text-[color:var(--accent-progress-text)]"
                    : "border-[color:var(--accent-korean)] text-[color:var(--accent-korean)]"
                }`}
              >
                N{w.jlptLevel}
              </span>
              <span lang="ja" className="min-w-0 flex-1 flex items-baseline gap-2 truncate">
                <span className="text-body text-[color:var(--fg)]" style={{ fontFamily: "var(--font-jp-serif)" }}>
                  {w.word}
                </span>
                <span data-answer className="text-small text-[color:var(--fg-faint)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
                  {w.reading}
                </span>
              </span>
              <span data-answer className="shrink-0 text-small text-[color:var(--fg-soft)]">
                {w.koreanMeanings[0]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 音/訓 한 줄. 첫 읽기가 대표 — 진하게 두고 나머지는 흐리게 깐다.
 * 퀴즈가 정답으로 묻는 것도 항상 readings[0]이라 (lib/data.ts) 강조가 그것과
 * 일치한다. 나머지를 지우지 않는 건 뒷면이 답을 확인하는 면이기 때문.
 */
function ReadingRow({
  label,
  readings,
}: {
  label: string;
  readings: readonly string[];
}) {
  if (readings.length === 0) return null;
  const [primary, ...rest] = readings;
  return (
    <div className="flex gap-3.5 items-baseline">
      <span className="text-caption text-[color:var(--fg-faint)] tracking-label w-9 font-medium">
        {label}
      </span>
      <span className="text-body">
        <span className="text-[color:var(--fg)]">{primary}</span>
        {rest.length > 0 && (
          <span className="text-[color:var(--fg-faint)]">
            {" ・ "}
            {rest.join(" ・ ")}
          </span>
        )}
      </span>
    </div>
  );
}

function KanjiBack({ card }: { card: KanjiCard }) {
  return (
    <div
      className="flex flex-col gap-4 text-[color:var(--fg-soft)]"
      style={{ fontFamily: "var(--font-jp-sans)" }}
    >
      <div
        className="text-hero leading-none font-semibold"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.02em",
        }}
      >
        {card.kanji}
      </div>
      <div className="flex flex-col gap-1.5 pl-1">
        <ReadingRow label="音" readings={card.onReadings} />
        <ReadingRow label="訓" readings={card.kunReadings} />
        <div className="mt-2 pt-2 border-t border-dashed border-[color:var(--line)] flex gap-2.5 items-baseline">
          <span
            className="text-xs font-semibold tracking-[0.1em] text-[color:var(--accent-korean)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            韓
          </span>
          <span className="text-small text-[color:var(--fg-soft)]">
            {card.koreanMeaning} {card.koreanSound[0]}
            {card.koreanSound.length > 1 && (
              <span className="text-[color:var(--fg-faint)]">
                ·{card.koreanSound.slice(1).join("·")}
              </span>
            )}
            {card.koreanHanja !== card.kanji && (
              <span className="ml-2 text-[color:var(--fg-faint)] text-xs">
                ({card.koreanHanja})
              </span>
            )}
          </span>
        </div>
        <SinoKoreanHint koreanSound={card.koreanSound} onReadings={card.onReadings} />
      </div>
    </div>
  );
}
