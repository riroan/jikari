"use client";

import { useMemo, useState } from "react";
import { ModePageShell } from "@/components/ModePageShell";
import { EmptyCardsState } from "@/components/EmptyCardsState";
import { BuildCard } from "@/components/BuildCard";
import { WriteCard } from "@/components/WriteCard";
import { SessionSummary } from "@/components/SessionSummary";
import { useCardsStore } from "@/lib/cards-store";
import { buildItems, pickDistractors, pickParticleDistractors, splitItem } from "@/lib/build-deck";
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
  const [style, setStyle] = useState<"assemble" | "write">("assemble");
  const [split, setSplit] = useState(false); // 조사 분리 (조립 전용)
  const [assists, setAssists] = useState(0); // 힌트를 쓴 문제 수 (세션 요약 표시용, SRS 무관)
  // 판마다 한 번만 만든다: 분할 가능한 카드만, 시드 셔플.
  const all = useMemo(() => buildItems(sentences, expressions), [sentences, expressions]);
  // 작문은 조각으로 자를 필요가 없어 짧은 문장·표현도 쓴다 (너무 길면 직접 치기 힘들어 뺀다).
  const writeAll = useMemo(
    () =>
      buildItems(sentences, expressions, 1).filter((i) => {
        const n = stripMarkup(parseMarkup(i.markup)).length;
        return n >= 5 && n <= 28;
      }),
    [sentences, expressions],
  );
  // 조사 분리는 단어/조사로 풀면 3조각 이상이 되는 두 덩어리 문장도 쓴다.
  const splitAll = useMemo(
    () => buildItems(sentences, expressions, 2).filter((i) => splitItem(i).chunks.length >= 3),
    [sentences, expressions],
  );
  const deck = useMemo(
    () => shuffleIds(style === "write" ? writeAll : split ? splitAll : all, seed),
    [all, splitAll, writeAll, style, split, seed],
  );
  const run = useQuizRun(deck.length);

  const shell = (children?: React.ReactNode) => (
    <ModePageShell title="組立">{children}</ModePageShell>
  );

  if (!mounted) return shell();
  if (deck.length === 0)
    return shell(<EmptyCardsState label="만들 문장이 아직 없어요." hint="문장 카드 시드 필요" />);
  if (!started)
    return shell(
      <Start
        style={style}
        onStyle={setStyle}
        split={split}
        onSplit={setSplit}
        hard={hard}
        onHard={setHard}
        onStart={() => setStarted(true)}
      />,
    );
  if (run.summary)
    return shell(
      <SessionSummary
        summary={run.summary}
        breakdown={assists > 0 ? `힌트 ${assists}회` : undefined}
        onRetry={run.retryMissed}
        onNext={() => { setAssists(0); run.next(); }}
      />,
    );

  const item = run.retryId
    ? deck.find((d) => d.id === run.retryId)
    : deck[index % deck.length];
  if (!item) return shell();
  const onResolved = (ok: boolean, assisted: boolean) => {
    if (assisted) setAssists((a) => a + 1);
    run.record(item.id, ok, item.ko, stripMarkup(parseMarkup(item.markup)));
    if (!run.retrying) setIndex((i) => i + 1);
  };
  const key = `${item.id}:${index}:${run.retrying}`;
  if (style === "write") return shell(<WriteCard key={key} item={item} onResolved={onResolved} />);
  const tiles = split ? splitItem(item) : item;
  const distractors = [
    ...(split ? pickParticleDistractors(tiles, seed + index) : []),
    ...(hard ? pickDistractors(item, all, seed + index) : []),
  ];
  return shell(
    <BuildCard
      key={key}
      item={tiles}
      seed={seed + index}
      distractors={distractors.length ? distractors : undefined}
      onResolved={onResolved}
    />,
  );
}

function Start({
  style,
  onStyle,
  split,
  onSplit,
  hard,
  onHard,
  onStart,
}: {
  style: "assemble" | "write";
  onStyle: (s: "assemble" | "write") => void;
  split: boolean;
  onSplit: (v: boolean) => void;
  hard: boolean;
  onHard: (h: boolean) => void;
  onStart: () => void;
}) {
  const seg = (v: "assemble" | "write", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={style === v}
      onClick={() => onStyle(v)}
      className={`flex-1 min-h-[44px] border-b-2 text-body transition-colors ${
        style === v
          ? "border-[color:var(--accent-korean)] text-[color:var(--fg)]"
          : "border-transparent text-[color:var(--fg-faint)]"
      }`}
    >
      {label}
    </button>
  );
  const toggle = (on: boolean, set: (v: boolean) => void, title: string, desc: string) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className="flex items-center justify-between gap-3 min-h-[44px] border-b border-[color:var(--line)] py-2 text-left"
    >
      <span>
        <span className="block text-body text-[color:var(--fg)]">{title}</span>
        <span className="block text-caption text-[color:var(--fg-faint)]">{desc}</span>
      </span>
      <span className={`text-caption tracking-wide ${on ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}>
        {on ? "켜짐" : "꺼짐"}
      </span>
    </button>
  );
  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="방식" className="flex gap-5 border-b border-[color:var(--line)]">
        {seg("assemble", "조립")}
        {seg("write", "작문")}
      </div>
      {style === "assemble" && (
        <div className="flex flex-col">
          {toggle(split, onSplit, "조사 분리", "단어와 조사를 따로 놓고, 안 쓰는 조사도 섞여 있어요")}
          {toggle(hard, onHard, "어려움", "쓰지 않는 조각이 1–2개 섞여 있어요")}
        </div>
      )}
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
