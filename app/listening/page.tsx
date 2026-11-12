"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { RubyText } from "@/components/Furigana";
import { SpeakingCard } from "@/components/SpeakingCard";
import { DictationCard } from "@/components/DictationCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import {
  generateChoices,
  generateVocabChoices,
  getSentence,
  getVocab,
  pickTranslationDistractors,
} from "@/lib/data";
import { weightedShuffleIds } from "@/lib/deck";
import { dictationReading } from "@/lib/dictation";
import { speak, speakSlow } from "@/lib/tts";
import { useIsClient, useClientNow } from "@/lib/use-is-client";
import { useQuizRun } from "@/lib/use-quiz-run";
import { useStore } from "@/lib/store";
import { takeSlow } from "@/lib/srs";
import { seededRandom } from "@/lib/prng";
import { MINIMAL_PAIRS, PAIR_KIND_KO, pairById, type PairWord } from "@/lib/minimal-pairs";
import { NUM_KINDS, makeNumQuiz, type NumKind } from "@/lib/listening-numbers";

/*
 * 듣기 결과는 SRS 모드 "listening"에 따로 쌓는다 (cardId = `word:…` · `sent:…` ·
 * `dict:…` · `pair:…` · `num:<kind>`). 단어 SRS 박스는 "글자를 보고 아는가"를 재는
 * 값이라 귀로 맞힌 결과를 섞으면 오염된다 — 그래서 같은 카드라도 모드를 나눈다.
 * 말하기 탭은 듣기가 아니라 기록하지 않는다.
 */
export default function ListeningPage() {
  return (
    <Suspense fallback={null}>
      <KindSwitch />
    </Suspense>
  );
}

type Kind = "word" | "sentence" | "pair" | "number" | "dictation" | "speaking";
const KINDS: readonly Kind[] = ["word", "sentence", "pair", "number", "dictation", "speaking"];

function KindSwitch() {
  const k = useSearchParams().get("kind") as Kind | null;
  const kind: Kind = k && KINDS.includes(k) ? k : "word";
  if (kind === "speaking") return <Speaking />;
  if (kind === "dictation") return <Dictation />;
  if (kind === "pair") return <Pairs />;
  if (kind === "number") return <Numbers />;
  return <Listening key={kind} kind={kind} />;
}

const seedOnce = () => Math.floor(Math.random() * 1_000_000);

/** 듣기 한 문제의 결과 기록: SRS(listening) + ◯/✕ 통계 + 포인트(review 경유). */
function useListenRecord() {
  const review = useStore((s) => s.review);
  const recordQuizResult = useStore((s) => s.recordQuizResult);
  return useCallback(
    (cardId: string, ok: boolean, typed = false, earnKey?: string) => {
      // 듣는 시간까지 응답 시간에 들어가 "느림" 판정이 무의미하다 — 버린다.
      takeSlow();
      review("listening", cardId, ok, typed ? "typed" : "choice", undefined, earnKey);
      recordQuizResult("listening", ok);
    },
    [review, recordQuizResult],
  );
}

/** 듣기 박스로 가중한 덱 — 자주 틀린 것이 더 자주 나온다. */
function useListenDeck(ids: readonly string[], prefix: string, seed: number) {
  const getBox = useStore((s) => s.getBox);
  return useMemo(
    () => weightedShuffleIds(ids, (id) => getBox("listening", `${prefix}:${id}`), seed),
    [ids, prefix, seed, getBox],
  );
}

function Shell({ active, children }: { active: Kind; children?: React.ReactNode }) {
  return (
    <ModePageShell title="聞き取り" statKey="listening" dueKey="listening" afterHeader={<KindTabs active={active} />}>
      {children}
    </ModePageShell>
  );
}

const noSpeech = (
  <p className="text-body text-[color:var(--fg-faint)]">
    이 브라우저는 음성 재생을 지원하지 않아 듣기 퀴즈를 쓸 수 없어요.
  </p>
);

function Listening({ kind }: { kind: "word" | "sentence" }) {
  const sentence = kind === "sentence";
  const mounted = useIsClient();
  const wordIds = useCardsStore((s) => s.vocabIds);
  const sentenceIds = useCardsStore((s) => s.sentenceIds);
  const ids = sentence ? sentenceIds : wordIds;
  const prefix = sentence ? "sent" : "word";
  const [seed] = useState(seedOnce);
  const [index, setIndex] = useState(0);
  const deck = useListenDeck(ids, prefix, seed);
  const run = useQuizRun(deck.length);
  const record = useListenRecord();

  const shell = (children?: React.ReactNode) => <Shell active={kind}>{children}</Shell>;

  if (!mounted) return shell();
  if (!("speechSynthesis" in window)) return shell(noSpeech);
  if (ids.length === 0)
    return shell(<EmptyCardsState label="단어 카드가 아직 없어요." hint="scripts/add-vocab.ts로 시드 필요" />);
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);

  const resolve = (id: string, ok: boolean, label: string, answer: string) => {
    if (!run.retrying) record(`${prefix}:${id}`, ok);
    run.record(id, ok, label, answer);
    if (!run.retrying) setIndex((i) => i + 1);
  };

  if (sentence) {
    const card = getSentence(run.retryId ?? deck[index % deck.length]);
    if (!card) return shell();
    // 보기: 정답 번역 + 덱의 다른 문장 번역 3개 (seed로 결정적).
    const others = deck
      .filter((id) => id !== card.id)
      .map((id) => getSentence(id)?.translation)
      .filter((t): t is string => !!t && t !== card.translation);
    const picked = pickTranslationDistractors(card.translation, others, seed + index);
    const { choices, correct } = generateChoices(card.translation, picked, seed + index);
    const full = card.sentence.replace("＿＿＿", card.blank);
    const ruby = (card.sentenceRuby ?? card.sentence).replace(
      "＿＿＿",
      card.blankRuby ?? card.blank,
    );
    return shell(
      <QuizCard
        key={card.id}
        question={<ListenPrompt text={full} />}
        minQuestionHeight={0}
        input={{ mode: "choice", choices, correct, choiceFontFamily: "var(--font-kr-sans)" }}
        back={
          <div className="flex flex-col gap-3">
            <div
              className="text-h2 leading-[1.8] font-medium"
              style={{ fontFamily: "var(--font-jp-serif)", color: "var(--fg)" }}
            >
              <RubyText text={ruby} />
            </div>
            <div className="text-small text-[color:var(--fg-soft)] leading-relaxed">
              {card.translation}
            </div>
          </div>
        }
        speak={full}
        onResolved={(ok) => resolve(card.id, ok, full, card.translation)}
      />,
    );
  }

  const card = getVocab(run.retryId ?? deck[index % deck.length]);
  if (!card) return shell();
  const { choices, correct } = generateVocabChoices(card, "recognition", seed + index);

  return shell(
    <QuizCard
      key={card.id}
      question={<ListenPrompt text={card.reading} />}
      minQuestionHeight={0}
      input={{
        mode: "choice",
        choices,
        correct,
        choiceFontFamily: "var(--font-kr-sans)",
      }}
      // 정답을 맞힌 뒤에만 글자를 보여준다 (후리가나 포함).
      back={
        <div>
          <div
            className="text-[56px] leading-tight font-semibold"
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
          <div className="mt-3 text-small text-[color:var(--fg-soft)]">
            {card.koreanMeanings.join(", ")}
          </div>
        </div>
      }
      speak={card.reading}
      onResolved={(ok) => resolve(card.id, ok, card.word, card.koreanMeanings[0] ?? "")}
    />,
  );
}

const PAIR_IDS = MINIMAL_PAIRS.map((p) => p.id);

/** 소리 구별: 최소쌍 중 하나를 들려주고 둘 중 고르기. 정답 공개 때 두 소리를 번갈아 들을 수 있다. */
function Pairs() {
  const mounted = useIsClient();
  const [seed] = useState(seedOnce);
  const [index, setIndex] = useState(0);
  const deck = useListenDeck(PAIR_IDS, "pair", seed);
  const run = useQuizRun(deck.length);
  const record = useListenRecord();
  const shell = (children?: React.ReactNode) => <Shell active="pair">{children}</Shell>;

  if (!mounted) return shell();
  if (!("speechSynthesis" in window)) return shell(noSpeech);
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);

  const pair = pairById.get(run.retryId ?? deck[index % deck.length]);
  if (!pair) return shell();
  const target = seededRandom(seed + index)() < 0.5 ? pair.a : pair.b;
  const other = target === pair.a ? pair.b : pair.a;
  const { choices, correct } = generateChoices(target.kana, [other.kana], seed + index);

  return shell(
    <QuizCard
      key={`${pair.id}:${index}`}
      question={<ListenPrompt text={target.kana} label={`들린 말은? · ${PAIR_KIND_KO[pair.kind]}`} />}
      minQuestionHeight={0}
      input={{ mode: "choice", choices, correct, choiceFontFamily: "var(--font-jp-sans)" }}
      back={
        <div className="flex flex-col">
          {[pair.a, pair.b].map((wd) => (
            <PairRow key={wd.kana} word={wd} heard={wd === target} />
          ))}
        </div>
      }
      onResolved={(ok) => {
        if (!run.retrying) record(`pair:${pair.id}`, ok);
        run.record(pair.id, ok, target.kana, target.ko);
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}

function PairRow({ word, heard }: { word: PairWord; heard: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-[color:var(--line)]">
      <div className="min-w-0">
        <div
          className={`text-h2 font-medium ${heard ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          {word.kana}
          {word.word !== word.kana && (
            <span className="ml-2 text-small" style={{ fontFamily: "var(--font-jp-serif)" }}>
              {word.word}
            </span>
          )}
        </div>
        <div className="text-caption text-[color:var(--fg-soft)]">
          {word.ko}
          {heard && <span className="ml-2 text-[color:var(--accent-progress-text)]">들린 말</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={() => speak(word.kana)}
        aria-label={`${word.kana} 듣기`}
        className="shrink-0 min-h-11 px-3 text-small border border-[color:var(--line)] rounded-sm text-[color:var(--fg)]"
      >
        듣기
      </button>
    </div>
  );
}

const NUM_DECK_LEN = 20;
const NUM_PROMPT: Record<NumKind, string> = {
  price: "들린 가격은?",
  time: "들린 시각은?",
  date: "들린 날짜는?",
  counter: "들린 수는?",
};

/**
 * 숫자 듣기: 종류(가격·시각·날짜·조수사)를 듣기 박스로 가중해 뽑고, 문제는 시드로 생성.
 * 문제 id `<kind>#<n>` 안에 시드가 들어 있어 다시 풀기가 같은 수를 다시 묻는다.
 */
function Numbers() {
  const mounted = useIsClient();
  const getBox = useStore((s) => s.getBox);
  const [seed] = useState(seedOnce);
  const [index, setIndex] = useState(0);
  const deck = useMemo(() => {
    const rnd = seededRandom(seed);
    const weights = NUM_KINDS.map((k) => 1 / getBox("listening", `num:${k}`));
    const total = weights.reduce((a, b) => a + b, 0);
    return Array.from({ length: NUM_DECK_LEN }, () => {
      let r = rnd() * total;
      return NUM_KINDS.find((_, i) => (r -= weights[i]) < 0) ?? NUM_KINDS[0];
    });
  }, [seed, getBox]);
  const run = useQuizRun(deck.length);
  const record = useListenRecord();
  const shell = (children?: React.ReactNode) => <Shell active="number">{children}</Shell>;

  if (!mounted) return shell();
  if (!("speechSynthesis" in window)) return shell(noSpeech);
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);

  const id = run.retryId ?? `${deck[index % deck.length]}#${index}`;
  const [kind, n] = id.split("#") as [NumKind, string];
  const q = makeNumQuiz(kind, seed * 31 + Number(n));
  const { choices, correct } = generateChoices(q.answer, q.distractors, seed + Number(n));

  return shell(
    <QuizCard
      key={id}
      question={<ListenPrompt text={q.reading} label={NUM_PROMPT[kind]} />}
      minQuestionHeight={0}
      input={{ mode: "choice", choices, correct, choiceFontFamily: "var(--font-jp-sans)" }}
      back={
        <div className="flex flex-col gap-1">
          <div className="text-h1 font-semibold tabular-nums text-[color:var(--fg)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
            {q.answer}
          </div>
          <div className="text-body text-[color:var(--fg-soft)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
            {q.reading}
          </div>
          {q.note && <div className="text-caption text-[color:var(--fg-faint)]">{q.note}</div>}
        </div>
      }
      speak={q.reading}
      onResolved={(ok) => {
        // SRS는 종류별 카드 하나, 포인트는 문제마다 (종류당 하루 2번 상한에 막히지 않게).
        if (!run.retrying) record(`num:${kind}`, ok, false, `listening:num:${q.answer}:${q.reading}`);
        run.record(id, ok, q.answer, q.reading);
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}

// 받아쓰기: 짧은 표현 카드 중 읽기를 후리가나에서 뽑을 수 있는 것만 (표현 덱은 읽기만 빌린다).
const MAX_DICTATION_LEN = 24;

function useExpressionDeck(prefix: string | null) {
  const expressionIds = useCardsStore((s) => s.expressionIds);
  const expressionById = useCardsStore((s) => s.expressionById);
  const getBox = useStore((s) => s.getBox);
  const [seed] = useState(seedOnce);
  const [index, setIndex] = useState(0);
  const deck = useMemo(() => {
    const ok = expressionIds.filter((id) => {
      const c = expressionById.get(id);
      const r = c && dictationReading(c.ruby ?? c.expression_jp);
      return !!r && r.length <= MAX_DICTATION_LEN;
    });
    return weightedShuffleIds(ok, (id) => (prefix ? getBox("listening", `${prefix}:${id}`) : 1), seed);
  }, [expressionIds, expressionById, seed, prefix, getBox]);
  return { expressionById, deck, index, setIndex };
}

function Dictation() {
  const mounted = useIsClient();
  const { expressionById, deck, index, setIndex } = useExpressionDeck("dict");
  const run = useQuizRun(deck.length);
  const record = useListenRecord();
  const shell = (children?: React.ReactNode) => <Shell active="dictation">{children}</Shell>;

  if (!mounted) return shell();
  if (!("speechSynthesis" in window)) return shell(noSpeech);
  if (deck.length === 0)
    return shell(<EmptyCardsState label="받아쓰기할 표현이 아직 없어요." hint="표현 카드 시드 필요" />);
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);

  const card = expressionById.get(run.retryId ?? deck[index % deck.length]);
  const markup = card && (card.ruby ?? card.expression_jp);
  const reading = markup ? dictationReading(markup) : null;
  if (!card || !markup || !reading) return shell();
  return shell(
    <DictationCard
      key={card.id}
      card={card}
      reading={reading}
      prompt={<ListenPrompt text={reading} label="들리는 대로 가나로 써 보세요" />}
      onResolved={(ok) => {
        if (!run.retrying) record(`dict:${card.id}`, ok, true);
        run.record(card.id, ok, card.expression_jp, card.translation_ko);
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}

function Speaking() {
  const mounted = useIsClient();
  const { expressionById, deck, index, setIndex } = useExpressionDeck(null);
  const run = useQuizRun(deck.length);
  const shell = (children?: React.ReactNode) => <Shell active="speaking">{children}</Shell>;
  if (!mounted) return shell();
  if (deck.length === 0)
    return shell(<EmptyCardsState label="말하기 할 표현이 아직 없어요." hint="표현 카드 시드 필요" />);
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);
  const card = expressionById.get(run.retryId ?? deck[index % deck.length]);
  const markup = card && (card.ruby ?? card.expression_jp);
  const reading = markup ? dictationReading(markup) : null;
  if (!card || !reading) return shell();
  return shell(
    <SpeakingCard
      key={card.id}
      card={card}
      reading={reading}
      onResolved={(ok) => {
        run.record(card.id, ok, card.expression_jp, card.translation_ko);
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}

function ListenPrompt({ text, label = "들리는 말의 뜻은?" }: { text: string; label?: string }) {
  const [played, setPlayed] = useState(false);
  const btn =
    "inline-flex items-center justify-center rounded-sm border border-[color:var(--fg)] px-6 text-body font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)] transition-colors";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption tracking-label text-[color:var(--fg-faint)]">
        {label}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            speak(text);
            setPlayed(true);
          }}
          style={{ minHeight: 56 }}
          className={btn}
        >
          {played ? "다시 듣기" : "듣기"}
        </button>
        {played && (
          <button
            type="button"
            onClick={() => speakSlow(text)}
            style={{ minHeight: 56 }}
            className={btn}
          >
            천천히
          </button>
        )}
      </div>
    </div>
  );
}

/** 탭별 듣기 복습 대기 수 — cardId 접두어로 나눈다. */
const PREFIX_TAB: Record<string, Kind> = { word: "word", sent: "sentence", pair: "pair", num: "number", dict: "dictation" };

function useDueByTab(): Partial<Record<Kind, number>> {
  const states = useStore((s) => s.learningStates);
  const now = useClientNow();
  return useMemo(() => {
    const out: Partial<Record<Kind, number>> = {};
    if (now === null) return out;
    for (const s of Object.values(states)) {
      if (s.mode !== "listening" || s.lastReviewed === 0 || s.nextDue > now) continue;
      const tab = PREFIX_TAB[s.cardId.slice(0, s.cardId.indexOf(":"))];
      if (tab) out[tab] = (out[tab] ?? 0) + 1;
    }
    return out;
  }, [states, now]);
}

const TAB_LABEL: Record<Kind, string> = {
  word: "단어",
  sentence: "문장",
  pair: "소리",
  number: "숫자",
  dictation: "받아쓰기",
  speaking: "말하기",
};

function KindTabs({ active }: { active: Kind }) {
  const due = useDueByTab();
  return (
    <div
      role="tablist"
      aria-label="듣기 종류"
      className="flex gap-4 mb-8 border-b border-[color:var(--line)] overflow-x-auto"
    >
      {KINDS.map((k) => (
        <Link
          key={k}
          role="tab"
          aria-selected={active === k}
          href={k === "word" ? "/listening" : `/listening?kind=${k}`}
          className={`shrink-0 inline-flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-2 -mb-px border-b-2 text-small tracking-wide transition-colors ${
            active === k
              ? "text-[color:var(--fg)] border-[color:var(--accent-korean)]"
              : "text-[color:var(--fg-faint)] border-transparent hover:text-[color:var(--fg-soft)]"
          }`}
        >
          {TAB_LABEL[k]}
          {(due[k] ?? 0) > 0 && (
            <span className="text-tiny tabular-nums text-[color:var(--accent-progress-text)]" aria-label={`복습 ${due[k]}장`}>
              {due[k]}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
