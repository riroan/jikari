"use client";

import { useEffect, useRef, useState } from "react";
import { AnswerFeedback } from "./AnswerFeedback";
import { RubyText } from "./Furigana";
import { SpeakButton } from "./SpeakButton";
import { TypingInput } from "./TypingInput";
import { checkDictation, type DictationResult } from "@/lib/dictation";
import type { ExpressionCard } from "@/lib/types";

/** 받아쓰기 한 문제: 들은 말을 가나로 입력 → 맞춤/틀린 글자 → 후리가나 + 뜻. */
export function DictationCard({
  card,
  reading,
  prompt,
  onResolved,
}: {
  card: ExpressionCard;
  reading: string;
  prompt: React.ReactNode;
  onResolved: (ok: boolean) => void;
}) {
  const [answer, setAnswer] = useState<{ input: string; res: DictationResult } | null>(null);
  const res = answer?.res;
  const nextRef = useRef<HTMLButtonElement>(null);
  // 제출 후 입력창이 disabled 되며 포커스가 body로 빠지므로 다음 버튼으로 옮긴다 (Enter로 진행).
  useEffect(() => {
    if (answer) nextRef.current?.focus();
  }, [answer]);
  return (
    <div className="flex flex-col gap-6">
      {prompt}
      <TypingInput
        ariaLabel="들은 말 가나로 입력"
        lang="ja"
        disabled={!!answer}
        onSubmit={(input) => setAnswer({ input, res: checkDictation(input, reading) })}
      />
      <div role="status">{res && <AnswerFeedback correct={res.correct} />}</div>
      {answer && res && (
        <div className="flex flex-col gap-4 pt-4 border-t border-[color:var(--line)]">
          {!res.correct && (
            <div className="flex flex-col gap-1 text-caption text-[color:var(--fg-faint)]">
              <div>
                입력:{" "}
                <span className="text-[color:var(--accent-korean)]" lang="ja" style={{ fontFamily: "var(--font-jp-sans)" }}>
                  {answer.input}
                </span>
              </div>
              <div
                className="text-h2 leading-tight"
                lang="ja"
                style={{ fontFamily: "var(--font-jp-sans)", color: "var(--fg)" }}
              >
                <span className="sr-only">
                  정답 {reading}, 틀린 글자: {[...reading].filter((_, i) => !res.diff[i]?.ok).join(" ") || "없음"}
                </span>
                {[...reading].map((ch, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    style={
                      res.diff[i]?.ok
                        ? undefined
                        : { color: "var(--accent-korean)", textDecoration: "underline", textUnderlineOffset: 6 }
                    }
                  >
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div
              className="text-h2 leading-[1.8] font-medium"
              lang="ja"
              style={{ fontFamily: "var(--font-jp-serif)", color: "var(--fg)" }}
            >
              <RubyText text={card.ruby ?? card.expression_jp} />
            </div>
            <div className="text-body text-[color:var(--fg-soft)]" style={{ fontFamily: "var(--font-kr-sans)" }}>
              {card.translation_ko}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1">
            <SpeakButton text={card.ruby ?? card.expression_jp} />
            <button
              ref={nextRef}
              type="button"
              onClick={() => onResolved(res.correct)}
              aria-label="다음 문제"
              className="px-4 py-2 text-caption tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
              style={{ minHeight: 44 }}
            >
              다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
