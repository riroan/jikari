import { parseMarkup, type Segment } from "./jp-markup";
import { diffAgainst, type DiffChar } from "./diff";
import { toHiragana, toKatakana } from "wanakana";
import { normalizeJapanese } from "./normalize";

// 받아쓰기는 소리만 비교한다: 공백·구두점·기호는 무시.
const IGNORED = /[\s、。，．,.！？!?…・「」『』（）()〜~―—-]/g;
const KANA_ONLY = /^[ぁ-ゟァ-ヿー]+$/;

// toKatakana→normalize: 長音 ー가 모음으로 풀려 こーひー = コーヒー = こうひい.
export const clean = (s: string) => normalizeJapanese(toKatakana(s.replace(IGNORED, "")));

// 데이터에 `{お疲|つか}れ`처럼 base 앞뒤 가나가 후리가나에서 빠진 경우가 있다 → 보충.
function rubyReading(base: string, furi: string): string {
  const pre = base.match(/^[ぁ-ゟァ-ヿー]+/)?.[0] ?? "";
  const suf = base.match(/[ぁ-ゟァ-ヿー]+$/)?.[0] ?? "";
  if (pre === base) return base;
  return (furi.startsWith(pre) ? "" : pre) + furi + (furi.endsWith(suf) ? "" : suf);
}

function readingOfSegments(segs: Segment[]): string {
  return segs
    .map((s) =>
      s.kind === "text" ? s.text : s.kind === "ruby" ? rubyReading(s.base, s.furigana) : readingOfSegments(s.children),
    )
    .join("");
}

/** 후리가나 마크업에서 히라가나 읽기를 뽑는다. 한자가 남아 읽기를 알 수 없으면 null. */
export function dictationReading(markup: string): string | null {
  const r = readingOfSegments(parseMarkup(markup)).replace(IGNORED, "");
  // ー는 풀지 않는다(표시용 원형 읽기). 비교는 clean()이 정규화.
  return KANA_ONLY.test(r) ? toHiragana(r, { convertLongVowelMark: false }) : null;
}

export interface DictationResult {
  correct: boolean;
  /** 정답 글자별로, 입력이 재현하지 못한 글자는 ok=false. */
  diff: DiffChar[];
}

export function checkDictation(input: string, reading: string): DictationResult {
  const answer = clean(reading);
  const typed = clean(input);
  return { correct: typed.length > 0 && typed === answer, diff: diffAgainst(typed, answer) };
}
