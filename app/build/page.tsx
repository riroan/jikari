"use client";

import { useMemo, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { BuildCard } from "@/components/BuildCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import { buildItems, pickDistractors } from "@/lib/build-deck";
import { shuffleIds } from "@/lib/deck";
import { stripMarkup, parseMarkup } from "@/lib/jp-markup";
import { useIsClient } from "@/lib/use-is-client";
import { useQuizRun } from "@/lib/use-quiz-run";

/*
 * 문장 만들기는 "뜻 → 일본어 산출" 연습이라 SRS(review())와 퀴즈 통계
 * (recordQuizResult)를 일부러 건드리지 않는다. 카드 박스는 "보고 아는가"를
 * 재는 값이라 조립 결과를 섞으면 오염된다. 결과는 세션 요약(run)에만 남긴다.
 */
export default function BuildPage() {
  const mounted = useIsClient();
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [hard, setHard] = useState(false);
  const [assists, setAssists] = useState(0); // 힌트를 쓴 문제 수 (세션 요약 표시용, SRS 무관)
  // 판마다 한 번만 만든다: 분할 가능한 카드만, 시드 셔플.
  const deck = useMemo(
    () => shuffleIds(buildItems(sentences, expressions), seed),
    [sentences, expressions, seed],
  );
  const run = useQuizRun(deck.length);

  const shell = (children?: React.ReactNode) => (
    <ModePageShell title="組立">{children}</ModePageShell>
  );

  if (!mounted) return shell();
  if (deck.length === 0)
    return shell(<EmptyCardsState label="만들 문장이 아직 없어요." hint="문장 카드 시드 필요" />);
  if (!started)
    return shell(<Start hard={hard} onHard={setHard} onStart={() => setStarted(true)} />);
  if (run.summary)
    return shell(
      <SessionSummary
        summary={run.summary}
        breakdown={assists > 0 ? `첫 조각 힌트 ${assists}회` : undefined}
        onRetry={run.retryMissed}
        onNext={() => { setAssists(0); run.next(); }}
      />,
    );

  const item = run.retryId
    ? deck.find((d) => d.id === run.retryId)
    : deck[index % deck.length];
  if (!item) return shell();
  return shell(
    <BuildCard
      key={`${item.id}:${index}:${run.retrying}`}
      item={item}
      seed={seed + index}
      distractors={hard ? pickDistractors(item, deck, seed + index) : undefined}
      onResolved={(ok, assisted) => {
        if (assisted) setAssists((a) => a + 1);
        run.record(item.id, ok, item.ko, stripMarkup(parseMarkup(item.markup)));
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}

function Start({ hard, onHard, onStart }: { hard: boolean; onHard: (h: boolean) => void; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-8">
      <p className="text-caption text-[color:var(--fg-faint)] leading-relaxed">
        뜻을 보고 조각을 탭해 일본어 문장을 만들어요. 복습 일정에는 영향이 없어요.
      </p>
      <button
        type="button"
        aria-pressed={hard}
        onClick={() => onHard(!hard)}
        className="flex items-center justify-between gap-3 min-h-[44px] border-t border-b border-[color:var(--line)] py-2 text-left"
      >
        <span>
          <span className="block text-body text-[color:var(--fg)]">어려움</span>
          <span className="block text-caption text-[color:var(--fg-faint)]">
            쓰지 않는 조각이 1–2개 섞여 있어요
          </span>
        </span>
        <span className={`text-caption tracking-wide ${hard ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}>
          {hard ? "켜짐" : "꺼짐"}
        </span>
      </button>
      <button
        type="button"
        onClick={onStart}
        className="w-full min-h-[56px] bg-[color:var(--accent-progress)] text-[color:var(--on-progress)] rounded-sm text-body font-semibold active:opacity-80 transition-opacity"
      >
        시작
      </button>
    </div>
  );
}
