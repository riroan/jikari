"use client";

import { useMemo, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { QuizCard } from "@/components/QuizCard";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { RubyText } from "@/components/Furigana";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import { generateVocabChoices, getVocab } from "@/lib/data";
import { shuffleIds } from "@/lib/deck";
import { speak } from "@/lib/tts";
import { useIsClient } from "@/lib/use-is-client";
import { useQuizRun } from "@/lib/use-quiz-run";

/*
 * 듣기 퀴즈는 SRS(review())와 퀴즈 통계(recordQuizResult)를 일부러 건드리지
 * 않는다. 단어 SRS 박스는 "글자를 보고 뜻/표기를 아는가"를 재는 값이라, 귀로
 * 맞힌 결과를 섞으면 박스·레이팅이 오염된다. 결과는 세션 요약(run)에만 남긴다.
 */
export default function ListeningPage() {
  const mounted = useIsClient();
  const run = useQuizRun();
  const vocabIds = useCardsStore((s) => s.vocabIds);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [index, setIndex] = useState(0);
  const deck = useMemo(() => shuffleIds(vocabIds, seed), [vocabIds, seed]);

  const shell = (children?: React.ReactNode) => (
    <ModePageShell title="聞き取り">{children}</ModePageShell>
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

function ListenPrompt({ text }: { text: string }) {
  const [played, setPlayed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-caption tracking-label text-[color:var(--fg-faint)]">
        들리는 말의 뜻은?
      </p>
      <button
        type="button"
        onClick={() => {
          speak(text);
          setPlayed(true);
        }}
        style={{ minHeight: 56 }}
        className="inline-flex items-center justify-center rounded-sm border border-[color:var(--fg)] px-6 text-body font-medium text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)] transition-colors"
      >
        {played ? "다시 듣기" : "듣기"}
      </button>
    </div>
  );
}
