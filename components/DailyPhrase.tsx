"use client";

import { useMemo } from "react";
import { RubyText } from "@/components/Furigana";
import { SpeakButton } from "@/components/SpeakButton";
import { useCardsStore } from "@/lib/cards-store";
import { useStore } from "@/lib/store";
import { pickDailyPhrase, pickDailySource } from "@/lib/daily-phrase";
import { PHRASE_PACKS, packPhrases } from "@/lib/phrase-packs";

const REGISTER_KO = { casual: "반말", polite: "정중", humble: "겸양" } as const;
const PACK_IDS = Object.keys(PHRASE_PACKS);

/**
 * 오늘의 한마디 — 헤어라인 섹션, 홈 CTA보다 조용하게. dateKey는 로컬 날짜.
 * 한마디 팩(프로필에서 구매)을 가지고 있으면 날마다 일상표현·팩 중 하나가 출처가 된다.
 */
export function DailyPhrase({ dateKey }: { dateKey: string }) {
  const expressions = useCardsStore((s) => s.expressions);
  const items = useStore((s) => s.progression?.items);
  const picked = useMemo(() => {
    const owned = PACK_IDS.filter((id) => items?.includes(id));
    const src = pickDailySource(1 + owned.length, dateKey);
    if (src === 0) {
      const card = pickDailyPhrase(expressions, dateKey);
      return card && { jp: card.ruby ?? card.expression_jp, ko: card.translation_ko, tag: REGISTER_KO[card.register] };
    }
    const packId = owned[src - 1];
    const phrase = pickDailyPhrase(packPhrases(packId, Number(dateKey.slice(5, 7))), dateKey);
    return phrase && { jp: phrase.jp, ko: phrase.ko, tag: PHRASE_PACKS[packId].jp };
  }, [expressions, items, dateKey]);
  if (!picked) return null;
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
            <RubyText text={picked.jp} />
          </div>
          <div className="text-caption text-[color:var(--fg-soft)] flex items-center gap-2">
            <span>{picked.ko}</span>
            <span className="text-tiny text-[color:var(--fg-faint)] border border-[color:var(--line)] rounded-sm px-1.5 py-0.5 whitespace-nowrap">
              {picked.tag}
            </span>
          </div>
        </div>
        <SpeakButton text={picked.jp} />
      </div>
    </section>
  );
}
