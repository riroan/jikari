import { RubyText } from "@/components/Furigana";
import type { SentenceCard } from "@/lib/types";

const BLANK = "＿＿＿";

/**
 * 빈칸을 채운 완성 문장 + 번역. 공부 모드 본문이자, 퀴즈에서 답한 뒤 보여 주는
 * 정답 면이다 — 선지만 눈에 남기고 넘어가지 않고 완성된 문장을 한 번 읽게 한다.
 */
export function SentenceFilled({ card }: { card: SentenceCard }) {
  const hasRuby = Boolean(card.sentenceRuby);
  const sentenceSrc = card.sentenceRuby ?? card.sentence;
  const answerSrc = card.blankRuby ?? card.blank;
  const [before, after] = sentenceSrc.split(BLANK);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="text-h2 leading-[1.8] font-medium"
        style={{
          fontFamily: "var(--font-jp-serif)",
          color: "var(--fg)",
          letterSpacing: "-0.01em",
        }}
      >
        {hasRuby ? <RubyText text={before ?? ""} /> : before}
        <span className="text-[color:var(--accent-progress-text)] font-semibold">
          {hasRuby ? <RubyText text={answerSrc} /> : answerSrc}
        </span>
        {after !== undefined && (hasRuby ? <RubyText text={after} /> : after)}
      </div>
      <div className="text-small text-[color:var(--fg-soft)] leading-relaxed">
        {card.translation}
      </div>
    </div>
  );
}
