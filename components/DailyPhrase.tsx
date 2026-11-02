"use client";

import { useMemo } from "react";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { useCardsStore } from "@/lib/cards-store";
import { pickDailyPhrase } from "@/lib/daily-phrase";

const REGISTER_KO = { casual: "반말", polite: "정중", humble: "겸양" } as const;

/** 오늘의 한마디 — 헤어라인 섹션, 홈 CTA보다 조용하게. dateKey는 로컬 날짜. */
export function DailyPhrase({ dateKey }: { dateKey: string }) {
  const expressions = useCardsStore((s) => s.expressions);
  const card = useMemo(() => pickDailyPhrase(expressions, dateKey), [expressions, dateKey]);
  if (!card) return null;
  const src = card.ruby ?? card.expression_jp;
  return (
    <section className="mb-8 border-t border-[color:var(--line)] pt-3">
      <div className="text-xs text-[color:var(--fg-faint)] tracking-label mb-1 font-medium">
        PHRASE
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div
            className="text-body leading-[1.8] text-[color:var(--fg)]"
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            <RubyText text={src} />
          </div>
          <div className="text-caption text-[color:var(--fg-soft)] flex items-center gap-2">
            <span>{card.translation_ko}</span>
            <span className="text-tiny text-[color:var(--fg-faint)] border border-[color:var(--line)] rounded-sm px-1.5 py-0.5 whitespace-nowrap">
              {REGISTER_KO[card.register]}
            </span>
          </div>
        </div>
        <SpeakButton text={src} />
      </div>
    </section>
  );
}
