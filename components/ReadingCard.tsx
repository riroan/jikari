"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { parseMarkup, type Segment } from "@/lib/jp-markup";
import type { ReadingItem } from "@/lib/reading";

const btn =
  "inline-flex items-center justify-center rounded-sm border text-body font-medium transition-colors";

/** highlight는 읽기 연습에 무의미한 단서라 벗겨서 평평하게 편다. */
function flatten(segs: Segment[]): Exclude<Segment, { kind: "highlight" }>[] {
  return segs.flatMap((s) => (s.kind === "highlight" ? flatten(s.children) : [s]));
}

/**
 * 읽기 연습 한 문장. 후리가나를 가리고 보여준 뒤, 모르는 한자어를 탭하면 그 단어의 읽기만 엿본다.
 * 엿보면 그 문장은 틀린 것으로 친다. SRS와 무관 (결과는 약한 문장 목록과 세션 요약에만).
 */
export function ReadingCard({
  item,
  onResolved,
}: {
  item: ReadingItem;
  onResolved: (ok: boolean, peeked: boolean) => void;
}) {
  const segs = useMemo(() => flatten(parseMarkup(item.markup)), [item.markup]);
  const [peeked, setPeeked] = useState<ReadonlySet<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const missed = peeked.size > 0;
  const plainText = segs.map((s) => (s.kind === "ruby" ? s.base : s.kind === "text" ? s.text : "")).join("");

  useEffect(() => {
    if (!revealed) return;
    nextRef.current?.focus({ preventScroll: true });
    nextRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [revealed]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-caption tracking-label text-[color:var(--fg-faint)]">
        소리 내어 읽어 보세요
      </p>

      {!revealed ? (
        <p
          className="text-h2 leading-[2.2] font-medium text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-jp-serif)" }}
          lang="ja"
        >
          {segs.map((s, i) => {
            if (s.kind === "text") return <span key={i}>{s.text}</span>;
            if (s.kind !== "ruby") return null;
            if (peeked.has(i))
              return (
                <ruby key={i} className="text-[color:var(--fg-soft)]">
                  {s.base}
                  <rt style={{ fontSize: "0.4em", fontWeight: 400, fontFamily: "var(--font-jp-sans)" }}>
                    {s.furigana}
                  </rt>
                </ruby>
              );
            return (
              <button
                key={i}
                type="button"
                aria-label={`읽기 보기 ${s.base}`}
                onClick={() => setPeeked((p) => new Set(p).add(i))}
                // 한 글자 단어(服·乾)는 폭이 20px뿐이라 누르기 어렵다. 글자 배치는 그대로 두고
                // ::before로 터치 영역만 가로 최소 44px까지 넓힌다 (넓으면 min()이 0이 돼 그대로).
                className="relative inline-block min-h-[44px] align-baseline underline decoration-dotted decoration-[color:var(--fg-faint)] underline-offset-[6px] before:absolute before:inset-y-0 before:left-[min(0px,calc((100%-44px)/2))] before:right-[min(0px,calc((100%-44px)/2))] before:content-['']"
              >
                {s.base}
              </button>
            );
          })}
        </p>
      ) : (
        <div
          className="text-h2 leading-[2.2] font-medium text-[color:var(--fg)]"
          style={{ fontFamily: "var(--font-jp-serif)" }}
          lang="ja"
        >
          <RubyText text={item.markup} forceShow />
        </div>
      )}

      {!revealed ? (
        <>
          <p className="text-tiny text-[color:var(--fg-faint)]">
            막히는 한자어를 탭하면 읽기가 보여요. 엿본 문장은 틀린 것으로 쳐요.
          </p>
          <button
            type="button"
            onClick={() => setRevealed(true)}
            style={{ minHeight: 56 }}
            className={`${btn} border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)]`}
          >
            정답 확인
          </button>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <p
            className="text-body leading-snug text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-kr-sans)" }}
          >
            {item.ko}
          </p>
          <div className="flex items-center justify-between gap-3">
            <SpeakButton text={plainText} />
            {missed && (
              <span role="status" className="text-caption text-[color:var(--fg-faint)]">
                엿봤어요 · 다시 나와요
              </span>
            )}
          </div>
          {missed ? (
            <button
              type="button"
              ref={nextRef}
              onClick={() => onResolved(false, true)}
              style={{ minHeight: 56 }}
              aria-label="다음 문제"
              className={`${btn} scroll-mb-[calc(var(--safe-bottom)+1rem)] border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)]`}
            >
              다음 →
            </button>
          ) : (
            <div className="flex gap-3 scroll-mb-[calc(var(--safe-bottom)+1rem)]">
              <button
                type="button"
                onClick={() => onResolved(false, false)}
                style={{ minHeight: 56 }}
                className={`${btn} flex-1 border-[color:var(--line)] text-[color:var(--fg-soft)] hover:bg-[color:var(--bg-deep)]`}
              >
                틀렸어요
              </button>
              <button
                type="button"
                ref={nextRef}
                onClick={() => onResolved(true, false)}
                style={{ minHeight: 56 }}
                className={`${btn} flex-1 border-[color:var(--fg)] text-[color:var(--fg)] hover:bg-[color:var(--bg-deep)]`}
              >
                맞았어요
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
