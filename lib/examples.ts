import { parseMarkup, stripMarkup } from "./jp-markup";
import type { ExpressionCard, SentenceCard, VocabCard } from "./types";

export interface Example {
  ruby: string; // with furigana markup (or plain)
  ko: string;
  plain: string; // markup-stripped, used for matching + TTS
}

const KANJI = /[一-鿿々]/;
const HIRAGANA = /[ぁ-ゖ]/;
const KANA_ONLY = /^[ぁ-ヿ]+$/;
const BLANK = /＿+/;

const plain = (s: string) => stripMarkup(parseMarkup(s));

/** Build the searchable list once per (sentences, expressions) pair. */
export function buildExampleIndex(
  sentences: SentenceCard[],
  expressions: ExpressionCard[],
): Example[] {
  const out: Example[] = [];
  for (const s of sentences) {
    const ruby = (s.sentenceRuby ?? s.sentence).replace(BLANK, s.blankRuby ?? s.blank);
    out.push({ ruby, ko: s.translation, plain: plain(ruby) });
  }
  for (const e of expressions) {
    const ruby = e.ruby ?? e.expression_jp;
    out.push({ ruby, ko: e.translation_ko, plain: plain(ruby) });
  }
  return out;
}

let cache: { s: SentenceCard[]; e: ExpressionCard[]; idx: Example[] } | null = null;
export function getExampleIndex(sentences: SentenceCard[], expressions: ExpressionCard[]) {
  if (!cache || cache.s !== sentences || cache.e !== expressions) {
    cache = { s: sentences, e: expressions, idx: buildExampleIndex(sentences, expressions) };
  }
  return cache.idx;
}

// godan dictionary ending -> te/ta endings (sound changes).
const GODAN_TE_TA: Record<string, [string, string]> = {
  う: ["って", "った"], つ: ["って", "った"], る: ["って", "った"],
  む: ["んで", "んだ"], ぶ: ["んで", "んだ"], ぬ: ["んで", "んだ"],
  く: ["いて", "いた"], ぐ: ["いで", "いだ"], す: ["して", "した"],
};

/** Full te/ta forms of a godan verb. Needs a kanji stem: kana-only (ある→あった, いう→いって) is too ambiguous. */
export function godanTeTaForms(word: string): string[] {
  const stem = word.slice(0, -1);
  if (!KANJI.test(stem)) return [];
  if (word.endsWith("行く")) return [stem + "って", stem + "った"]; // 行く: irregular (not 行いて)
  return (GODAN_TE_TA[word.slice(-1)] ?? []).map((e) => stem + e);
}

/** Strings to look for: the word, plus the dictionary-form stem for verbs/i-adjectives. */
function needles(v: Pick<VocabCard, "word" | "verbGroup" | "adjGroup">): string[] {
  const w = v.word;
  const out = [w];
  if (v.verbGroup && v.verbGroup !== "not_verb") {
    out.push(w.endsWith("する") ? w.slice(0, -2) : w.slice(0, -1));
    // te/ta forms (index >= 2) are full strings, not stems.
    if (v.verbGroup === "godan") out.push(...godanTeTaForms(w));
  } else if (v.adjGroup === "i_adj" && w.endsWith("い")) {
    out.push(w.slice(0, -1));
  }
  return out;
}

function found(text: string, n: string, isStem: boolean, conj = false): boolean {
  // ponytail: kana-only words of 1-2 chars are too ambiguous (いる in はいる) — skipped.
  if (n.length === 0 || (KANA_ONLY.test(n) && n.length < 3)) return false;
  for (let i = text.indexOf(n); i !== -1; i = text.indexOf(n, i + 1)) {
    // conjugated form of a 1-kanji verb (行った) must not sit inside a compound (銀行った).
    if (conj && !KANJI.test(n[1]) && KANJI.test(text[i - 1] ?? "")) continue;
    if (n.length > 1) return true;
    // 1-char kanji (本, 行): not part of a compound (日本, 銀行); stems must be followed by kana.
    const before = text[i - 1] ?? "";
    const after = text[i + 1] ?? "";
    if (KANJI.test(before) || KANJI.test(after)) continue;
    if (isStem && !HIRAGANA.test(after)) continue;
    return true;
  }
  return false;
}

export function findExamples(
  vocab: Pick<VocabCard, "word" | "verbGroup" | "adjGroup">,
  index: Example[],
  max = 2,
): Example[] {
  const ns = needles(vocab);
  const res: Example[] = [];
  for (const ex of index) {
    if (ns.some((n, i) => found(ex.plain, n, i === 1, i > 1))) {
      res.push(ex);
      if (res.length >= max) break;
    }
  }
  return res;
}
