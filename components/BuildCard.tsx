"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerFeedback } from "@/components/AnswerFeedback";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { shuffleIds } from "@/lib/deck";
import { isAssembled } from "@/lib/build-chunks";
import { isParticleTile, type BuildItem } from "@/lib/build-deck";

const pill =
  "inline-flex items-center justify-center min-h-[44px] px-3 border rounded-sm text-body text-[color:var(--fg)] transition-colors disabled:cursor-default";

/**
 * 문장 만들기 한 문제. 뜻을 보고 일본어 청크를 탭해 순서대로 조립한다.
 * 정답이 이미 순서대로 놓인 채 시작하지 않도록 은행 순서는 시드 셔플 후 보정한다.
 */
export function BuildCard({
  item,
  seed,
  distractors = [],
  onResolved,
}: {
  item: BuildItem;
  seed: number;
  /** 어려움 모드의 함정 조각 (쓰면 오답). */
  distractors?: string[];
  onResolved: (ok: boolean, assisted: boolean) => void;
}) {
  const n = item.chunks.length;
  // 은행에 놓일 전체 조각: 정답 청크(0..n-1) + 함정(n..)
  const all = useMemo(() => [...item.chunks, ...distractors], [item.chunks, distractors]);
  // 은행 슬롯 i에 놓인 청크 = all[order[i]]
  const order = useMemo(() => {
    const o = shuffleIds([...Array(all.length).keys()], seed);
    return o.every((v, i) => v === i) ? [...o.slice(1), o[0]] : o;
  }, [all.length, seed]);
  const [assisted, setAssisted] = useState(false);
  const [placed, setPlaced] = useState<number[]>([]); // 은행 슬롯 번호, 놓은 순서
  const [result, setResult] = useState<boolean | null>(null);
  const done = result !== null;
  const nextRef = useRef<HTMLButtonElement>(null);
  // 확인 버튼이 사라지며 포커스를 잃으므로 다음 버튼으로 옮기고 화면 안으로 가져온다.
  useEffect(() => {
    if (!done) return;
    nextRef.current?.focus({ preventScroll: true });
    nextRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [done]);

  const check = () => {
    if (done) return;
    setResult(isAssembled(placed.map((s) => all[order[s]]), item.chunks));
  };
  // 첫 조각을 맨 앞에 놓는다 (이미 다른 자리에 놓았으면 옮긴다). 카드당 한 번.
  const hint = () => {
    const slot = order.indexOf(0);
    setPlaced((p) => [slot, ...p.filter((x) => x !== slot)]);
    setAssisted(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-caption tracking-label text-[color:var(--fg-faint)]">
          일본어로 만들어 보세요
        </p>
        <p
          className="mt-2 text-h2 leading-snug font-medium text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-kr-sans)" }}
        >
          {item.ko}
        </p>
      </div>

      <div
        role="group"
        aria-label="만든 문장"
        className="flex flex-wrap content-start gap-2 min-h-[116px] py-3 border-y border-[color:var(--line)]"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        {placed.map((s) => (
          <button
            key={s}
            type="button"
            disabled={done}
            onClick={() => setPlaced((p) => p.filter((x) => x !== s))}
            aria-label={`빼기 ${all[order[s]].replace(/\{([^|]+)\|[^}]+\}/g, "$1")}`}
            className={`${pill} border-[color:var(--fg)] ${isParticleTile(all[order[s]]) ? "bg-[color:var(--bg-deep)] min-w-[44px]" : ""}`}
          >
            <RubyText text={all[order[s]]} />
          </button>
        ))}
      </div>

      <div
        role="group"
        aria-label="청크"
        className="flex flex-wrap gap-2"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        {order.map((c, s) => {
          const used = placed.includes(s);
          // 풀이 후 남은 함정은 흐리게 + 점선으로 "안 쓰는 조각"임을 알린다.
          const leftover = done && c >= n && !used;
          return (
            <button
              key={s}
              type="button"
              disabled={used || done}
              onClick={() => setPlaced((p) => [...p, s])}
              aria-label={leftover ? `쓰지 않는 조각 ${all[c].replace(/\{([^|]+)\|[^}]+\}/g, "$1")}` : undefined}
              className={`${pill} ${leftover ? "border-dashed" : ""} ${isParticleTile(all[c]) ? "bg-[color:var(--bg-deep)] min-w-[44px]" : ""} border-[color:var(--line)] ${
                used ? "opacity-25" : leftover ? "opacity-50 text-[color:var(--fg-faint)]" : "hover:bg-[color:var(--bg-deep)] active:bg-[color:var(--bg-deep)]"
              }`}
            >
              <RubyText text={all[c]} />
            </button>
          );
        })}
      </div>

      {!done && (
        <button
          type="button"
          onClick={hint}
          disabled={assisted}
          className="self-start min-h-[44px] px-1 text-caption tracking-wide text-[color:var(--fg-faint)] underline underline-offset-4 disabled:no-underline disabled:opacity-50"
        >
          첫 조각 보기
        </button>
      )}

      <div className="flex flex-col gap-3">
        <div role="status">{done && <AnswerFeedback correct={result} />}</div>
      {!done ? (
        <button
          type="button"
          onClick={check}
          style={{ minHeight: 56 }}
          className="inline-flex items-center justify-center rounded-sm border border-[color:var(--fg)] text-body font-medium text-[color:var(--fg)] transition-colors hover:bg-[color:var(--bg-deep)]"
        >
          확인
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className="text-h2 leading-[1.8] font-medium text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            <RubyText text={item.markup} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <SpeakButton text={item.markup} />
            <button
              type="button"
              onClick={() => onResolved(result, assisted)}
              ref={nextRef}
              style={{ minHeight: 56 }}
              className="scroll-mb-[calc(var(--safe-bottom)+1rem)] px-8 text-body font-medium rounded-sm border border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)] transition-colors"
              aria-label="다음 문제"
            >
              다음 →
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
