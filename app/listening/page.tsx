"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { RubyText } from "@/components/Furigana";
import { DictationCard } from "@/components/DictationCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import { generateChoices, generateVocabChoices, getSentence, getVocab } from "@/lib/data";
import { shuffleIds } from "@/lib/deck";
import { dictationReading } from "@/lib/dictation";
import { speak } from "@/lib/tts";
import { useIsClient } from "@/lib/use-is-client";
import { useQuizRun } from "@/lib/use-quiz-run";

/*
 * 듣기 퀴즈는 SRS(review())와 퀴즈 통계(recordQuizResult)를 일부러 건드리지
 * 않는다. 단어 SRS 박스는 "글자를 보고 뜻/표기를 아는가"를 재는 값이라, 귀로
 * 맞힌 결과를 섞으면 박스·레이팅이 오염된다. 결과는 세션 요약(run)에만 남긴다.
 */
export default function ListeningPage() {
  return (
    <Suspense fallback={null}>
      <KindSwitch />
    </Suspense>
  );
}

type Kind = "word" | "sentence" | "dictation";

function KindSwitch() {
  const k = useSearchParams().get("kind");
  const kind = k === "sentence" || k === "dictation" ? k : "word";
  return kind === "dictation" ? <Dictation /> : <Listening key={kind} kind={kind} />;
}

function Listening({ kind }: { kind: "word" | "sentence" }) {
  const sentence = kind === "sentence";
  const mounted = useIsClient();
  const wordIds = useCardsStore((s) => s.vocabIds);
  const sentenceIds = useCardsStore((s) => s.sentenceIds);
  const vocabIds = sentence ? sentenceIds : wordIds;
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [index, setIndex] = useState(0);
  const deck = useMemo(() => shuffleIds(vocabIds, seed), [vocabIds, seed]);
  const run = useQuizRun(deck.length);

  const shell = (children?: React.ReactNode) => (
    <ModePageShell title="聞き取り" afterHeader={<KindTabs active={kind} />}>
      {children}
    </ModePageShell>
  );

  if (!mounted) return shell();
  if (!("speechSynthesis" in window))
    return shell(
      <p className="text-body text-[color:var(--fg-faint)]">
        이 브라우저는 음성 재생을 지원하지 않아 듣기 퀴즈를 쓸 수 없어요.
      </p>,
    );
  if (vocabIds.length === 0)
    return shell(<EmptyCardsState label="단어 카드가 아직 없어요." hint="scripts/add-vocab.ts로 시드 필요" />);
  if (run.summary)
    return shell(
      <SessionSummary
        summary={run.summary}
        onRetry={run.retryMissed}
        onNext={run.next}
      />,
    );

  if (sentence) {
    const card = getSentence(run.retryId ?? deck[index % deck.length]);
    if (!card) return shell();
    // 보기: 정답 번역 + 덱의 다른 문장 번역 3개 (seed로 결정적).
    const others = deck
      .filter((id) => id !== card.id)
      .map((id) => getSentence(id)?.translation)
      .filter((t): t is string => !!t && t !== card.translation);
    const picked = shuffleIds(others, seed + index).slice(0, 3);
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
          <div
            className="text-h2 leading-[1.8] font-medium"
            style={{ fontFamily: "var(--font-jp-serif)", color: "var(--fg)" }}
          >
            <RubyText text={ruby} />
          </div>
        }
        speak={full}
        onResolved={(ok) => {
          run.record(card.id, ok, full, card.translation);
          if (!run.retrying) setIndex((i) => i + 1);
        }}
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
        </div>
      }
      speak={card.reading}
      onResolved={(ok) => {
        run.record(card.id, ok, card.word, card.koreanMeanings[0] ?? "");
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}

// 받아쓰기: 짧은 표현 카드 중 읽기를 후리가나에서 뽑을 수 있는 것만 (SRS 무관, 표현 덱은 읽기만 빌린다).
const MAX_DICTATION_LEN = 24;

function Dictation() {
  const mounted = useIsClient();
  const expressionIds = useCardsStore((s) => s.expressionIds);
  const expressionById = useCardsStore((s) => s.expressionById);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [index, setIndex] = useState(0);
  const deck = useMemo(() => {
    const ok = expressionIds.filter((id) => {
      const c = expressionById.get(id);
      const r = c && dictationReading(c.ruby ?? c.expression_jp);
      return !!r && r.length <= MAX_DICTATION_LEN;
    });
    return shuffleIds(ok, seed);
  }, [expressionIds, expressionById, seed]);
  const run = useQuizRun(deck.length);

  const shell = (children?: React.ReactNode) => (
    <ModePageShell title="聞き取り" afterHeader={<KindTabs active="dictation" />}>
      {children}
    </ModePageShell>
  );

  if (!mounted) return shell();
  if (!("speechSynthesis" in window))
    return shell(
      <p className="text-body text-[color:var(--fg-faint)]">
        이 브라우저는 음성 재생을 지원하지 않아 받아쓰기를 쓸 수 없어요.
      </p>,
    );
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
            onClick={() => speak(text, 0.6)}
            style={{ minHeight: 56 }}
            className={btn}
          >
            천천히
          </button>
        )}
      </div>
      {!played && (
        <p className="text-tiny text-[color:var(--fg-faint)]">
          듣기 버튼을 누르면 소리가 나와요
        </p>
      )}
    </div>
  );
}

function KindTabs({ active }: { active: Kind }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      role="tab"
      aria-selected={on}
      href={href}
      className={`inline-flex items-center justify-center min-h-[44px] min-w-[44px] py-2 -mb-px border-b-2 text-small tracking-wide transition-colors ${
        on
          ? "text-[color:var(--fg)] border-[color:var(--accent-korean)]"
          : "text-[color:var(--fg-faint)] border-transparent hover:text-[color:var(--fg-soft)]"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div role="tablist" aria-label="듣기 종류" className="flex gap-5 mb-8 border-b border-[color:var(--line)]">
      {tab("/listening", "단어", active === "word")}
      {tab("/listening?kind=sentence", "문장", active === "sentence")}
      {tab("/listening?kind=dictation", "받아쓰기", active === "dictation")}
    </div>
  );
}
