"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerFeedback } from "@/components/AnswerFeedback";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { TypingInput } from "@/components/TypingInput";
import { diffAgainst } from "@/lib/diff";
import { judgeWriting, type WriteJudgement } from "@/lib/write-grade";
import { parseMarkup, stripMarkup } from "@/lib/jp-markup";
import type { BuildItem } from "@/lib/build-deck";

/**
 * 작문 한 문제: 한국어 뜻을 보고 일본어 문장을 직접 쓴다.
 * 채점은 lib/write-grade — 한자/가나/섞어 쓴 표기를 다 인정하고, 한두 글자 차이는
 * "거의 맞아요"로 정답과 나란히 보여 준다. 정답이 하나가 아닐 수 있는 문제라
 * 틀림·근접일 때는 "내 답도 맞아요"로 직접 뒤집을 수 있다 (말하기 탭의 자가 채점과 같은 취지).
 */
export function WriteCard({
  item,
  onResolved,
}: {
  item: BuildItem;
  onResolved: (ok: boolean, assisted: boolean) => void;
}) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [judge, setJudge] = useState<WriteJudgement | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const plain = useMemo(() => stripMarkup(parseMarkup(item.markup)), [item.markup]);
  const done = judge !== null;
  const ok = judge?.tier === "exact" || overridden;

  useEffect(() => {
    if (!done) return;
    nextRef.current?.focus({ preventScroll: true });
    nextRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [done]);

  const submit = (v: string) => {
    if (done) return;
    setAnswer(v);
    setJudge(judgeWriting(v, item.markup));
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-caption tracking-label text-[color:var(--fg-faint)]">일본어로 써 보세요</p>
        <p
          className="mt-2 text-h2 leading-snug font-medium text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-kr-sans)" }}
        >
          {item.ko}
        </p>
      </div>

      <TypingInput
        ariaLabel="일본어 문장 입력"
        lang="ja"
        disabled={done}
        onSubmit={submit}
        hintAnswer={plain}
        onHintUsed={() => setAssisted(true)}
      />

      {done && judge && (
        <div className="flex flex-col gap-3">
          <div role="status">
            <AnswerFeedback correct={ok} />
            {judge.tier === "close" && !overridden && (
              <p className="mt-1 text-caption text-[color:var(--fg-faint)]">거의 맞아요 — 한두 글자가 달라요</p>
            )}
          </div>
          {judge.tier === "close" && answer !== null && (
            <p lang="ja" className="text-body text-[color:var(--fg-soft)] break-words" style={{ fontFamily: "var(--font-jp-sans)" }}>
              {diffAgainst(answer, judge.closest).map((d, i) => (
                <span key={i} className={d.ok ? "" : "text-[color:var(--accent-korean)] underline underline-offset-4"}>
                  {d.ch}
                </span>
              ))}
            </p>
          )}
          <div
            className="text-h2 leading-[1.8] font-medium text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            <RubyText text={item.markup} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <SpeakButton text={item.markup} />
              {judge.tier !== "exact" && !overridden && (
                <button
                  type="button"
                  onClick={() => setOverridden(true)}
                  className="min-h-[44px] px-2 text-caption tracking-wide text-[color:var(--fg-faint)] underline underline-offset-4"
                >
                  내 답도 맞아요
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onResolved(ok, assisted)}
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
  );
}
