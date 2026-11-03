"use client";

import { useMemo, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { BuildCard } from "@/components/BuildCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import { buildItems } from "@/lib/build-deck";
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
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);

  const item = run.retryId
    ? deck.find((d) => d.id === run.retryId)
    : deck[index % deck.length];
  if (!item) return shell();
  return shell(
    <BuildCard
      key={`${item.id}:${index}:${run.retrying}`}
      item={item}
      seed={seed + index}
      onResolved={(ok) => {
        run.record(item.id, ok, item.ko, stripMarkup(parseMarkup(item.markup)));
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}
