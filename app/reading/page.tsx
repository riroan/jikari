"use client";

import { useMemo, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { ReadingCard } from "@/components/ReadingCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import { parseMarkup, stripMarkup } from "@/lib/jp-markup";
import { loadWeak, orderDeck, readingItems, saveWeak, updateWeak } from "@/lib/reading";
import { useIsClient } from "@/lib/use-is-client";
import { useQuizRun } from "@/lib/use-quiz-run";

/*
 * 읽기 연습은 "소리 내어 읽을 수 있는가"를 스스로 채점하는 모드라 SRS(review())와
 * 퀴즈 통계를 건드리지 않는다. 엿보거나 틀린 문장은 기기 로컬 목록(localStorage)에
 * 남겨 다음 판 앞쪽에 다시 내놓는다. DB/진행 데이터 스키마는 그대로.
 */
export default function ReadingPage() {
  const mounted = useIsClient();
  const sentences = useCardsStore((s) => s.sentences);
  const expressions = useCardsStore((s) => s.expressions);
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [index, setIndex] = useState(0);
  const [weak, setWeak] = useState<ReadonlySet<string>>(() =>
    typeof window === "undefined" ? new Set() : loadWeak(),
  );
  const items = useMemo(() => readingItems(sentences, expressions), [sentences, expressions]);
  const [initialWeak] = useState(weak); // 판 도중 순서가 흔들리지 않게 시작 시점 목록으로만 정렬
  const deck = useMemo(
    () => orderDeck(items.map((i) => i.id), initialWeak, seed),
    [items, initialWeak, seed],
  );
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const run = useQuizRun(deck.length);

  const shell = (children?: React.ReactNode) => <ModePageShell title="音読">{children}</ModePageShell>;

  if (!mounted) return shell();
  if (deck.length === 0)
    return shell(<EmptyCardsState label="읽을 문장이 아직 없어요." hint="문장 카드 시드 필요" />);
  if (run.summary)
    return shell(<SessionSummary summary={run.summary} onRetry={run.retryMissed} onNext={run.next} />);

  const item = byId.get(run.retryId ?? deck[index % deck.length]);
  if (!item) return shell();
  return shell(
    <ReadingCard
      key={`${item.id}:${index}:${run.retrying}`}
      item={item}
      onResolved={(ok, peeked) => {
        if (!run.retrying) {
          const next = updateWeak(weak, item.id, ok, peeked);
          setWeak(next);
          saveWeak(next);
        }
        run.record(item.id, ok && !peeked, stripMarkup(parseMarkup(item.markup)), item.ko);
        if (!run.retrying) setIndex((i) => i + 1);
      }}
    />,
  );
}
