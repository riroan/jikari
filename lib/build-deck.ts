import { segmentSentence } from "./build-chunks";
import type { ExpressionCard, SentenceCard } from "./types";

export interface BuildItem {
  id: string;
  /** 후리가나 마크업이 붙은 완성 문장 (chunks.join("") === markup). */
  markup: string;
  chunks: string[];
  /** 한국어 뜻 */
  ko: string;
}

/** 빈칸을 정답으로 채운 문장 + 표현 카드 중 3–7청크로 쪼개지는 것만. */
export function buildItems(
  sentences: readonly SentenceCard[],
  expressions: readonly ExpressionCard[],
): BuildItem[] {
  const out: BuildItem[] = [];
  const add = (id: string, markup: string, ko: string) => {
    const chunks = segmentSentence(markup);
    if (chunks) out.push({ id, markup, chunks, ko });
  };
  for (const c of sentences) {
    const m = (c.sentenceRuby ?? c.sentence).replace("＿＿＿", c.blankRuby ?? c.blank);
    add(c.id, m, c.translation);
  }
  for (const c of expressions) add(c.id, c.ruby ?? c.expression_jp, c.translation_ko);
  return out;
}
