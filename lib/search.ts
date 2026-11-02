import { toHiragana } from "wanakana";
import { parseMarkup, stripMarkup, type Segment } from "./jp-markup";
import type {
  ExpressionCard,
  GrammarCard,
  KanjiCard,
  SentenceCard,
  VocabCard,
} from "./types";

export type SearchSubject = "kanji" | "vocab" | "sentence" | "expression" | "grammar";

export interface SearchSource {
  kanji: KanjiCard[];
  vocab: VocabCard[];
  sentences: SentenceCard[];
  expressions: ExpressionCard[];
  grammar: GrammarCard[];
}

export interface SearchEntry {
  key: string;
  subject: SearchSubject;
  /** Japanese with optional {漢字|かな} markup — render via RubyText. */
  ruby: string;
  /** Plain Japanese — TTS input. */
  speak: string;
  ko: string;
  /** Extra lines shown when a row is expanded. */
  extra: string[];
  /** Normalized match keys (kana → hiragana, lowercased). */
  keys: string[];
}

export const SUBJECT_LABEL: Record<SearchSubject, string> = {
  kanji: "漢字",
  vocab: "単語",
  sentence: "文",
  expression: "表現",
  grammar: "文法",
};

const raw = (s: string) => s.normalize("NFC").toLowerCase().replace(/\s+/g, "");
const norm = (s: string) => toHiragana(raw(s));

function reading(segs: Segment[]): string {
  return segs
    .map((s) =>
      s.kind === "text" ? s.text : s.kind === "ruby" ? s.furigana : reading(s.children),
    )
    .join("");
}

const plain = (markup: string) => stripMarkup(parseMarkup(markup));
const kana = (markup: string) => reading(parseMarkup(markup));
const clean = (r: string) => r.replace(/[.\-]/g, "");

function entry(
  e: Omit<SearchEntry, "keys" | "speak"> & { speak?: string },
  keys: string[],
): SearchEntry {
  return {
    ...e,
    speak: e.speak ?? plain(e.ruby),
    keys: [...new Set(keys.filter(Boolean).flatMap((k) => [norm(k), raw(k)]))],
  };
}

export function buildIndex(src: SearchSource): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const c of src.kanji) {
    const ons = c.onReadings.map(clean);
    const kuns = c.kunReadings.map(clean);
    out.push(
      entry(
        {
          key: `kanji:${c.id}`,
          subject: "kanji",
          ruby: c.kanji,
          ko: c.koreanMeaning,
          extra: [
            `音 ${c.onReadings.join("・")}`,
            `訓 ${c.kunReadings.join("・")}`,
            `韓 ${c.koreanHanja} ${c.koreanSound.join("・")}`,
          ].filter((l) => !/^[音訓] $/.test(l)),
        },
        [c.kanji, ...ons, ...kuns, c.koreanMeaning, ...c.koreanSound, ...c.meanings],
      ),
    );
  }
  for (const c of src.vocab) {
    out.push(
      entry(
        {
          key: `vocab:${c.id}`,
          subject: "vocab",
          ruby: c.ruby ?? c.word,
          speak: c.word,
          ko: c.koreanMeanings.join(", "),
          extra: [c.reading, c.meanings.join(", ")].filter(Boolean),
        },
        [c.word, c.reading, ...c.koreanMeanings, ...c.meanings],
      ),
    );
  }
  for (const c of src.sentences) {
    const blank = /＿+/;
    const ruby = (c.sentenceRuby ?? c.sentence).replace(blank, c.blankRuby ?? c.blank);
    out.push(
      entry(
        { key: `sentence:${c.id}`, subject: "sentence", ruby, ko: c.translation, extra: [] },
        [plain(ruby), kana(ruby), c.translation],
      ),
    );
  }
  for (const c of src.expressions) {
    const ruby = c.ruby ?? c.expression_jp;
    out.push(
      entry(
        {
          key: `expression:${c.id}`,
          subject: "expression",
          ruby,
          speak: c.expression_jp,
          ko: c.translation_ko,
          extra: [c.situation_ko, c.note_ko ?? ""].filter(Boolean),
        },
        [c.expression_jp, kana(ruby), c.translation_ko, c.situation_ko],
      ),
    );
  }
  for (const c of src.grammar) {
    if (c.type === "pattern") {
      const ex = c.examples[0];
      out.push(
        entry(
          {
            key: `grammar:${c.id}`,
            subject: "grammar",
            ruby: c.pattern,
            speak: c.pattern.replace(/[〜~]/g, ""),
            ko: c.meaningKo,
            extra: [c.koreanStructure, ex ? `${plain(ex.jp)} — ${ex.ko}` : ""].filter(Boolean),
          },
          [c.pattern.replace(/[〜~]/g, ""), c.meaningKo, c.koreanStructure],
        ),
      );
    } else {
      const ex = c.examples[0];
      out.push(
        entry(
          {
            key: `grammar:${c.id}`,
            subject: "grammar",
            ruby: c.particles.join("・"),
            speak: c.particles.join("と"),
            ko: c.rule,
            extra: ex ? [`${plain(ex.jp)} — ${ex.ko}`] : [],
          },
          [...c.particles, c.rule],
        ),
      );
    }
  }
  return out;
}

/** 3 exact, 2 prefix, 1 contains, 0 miss — best across keys and query variants. */
function score(keys: string[], qs: string[]): number {
  let best = 0;
  for (const k of keys)
    for (const q of qs) {
      if (k === q) return 3;
      if (k.startsWith(q)) best = Math.max(best, 2);
      else if (best < 1 && k.includes(q)) best = 1;
    }
  return best;
}

export function search(
  index: SearchEntry[],
  query: string,
  limit = 30,
): { hits: SearchEntry[]; total: number } {
  const q = norm(query);
  if (!q) return { hits: [], total: 0 };
  // Romaji input also matches as-is against English meanings.
  const qs = [...new Set([q, raw(query)])];
  const scored: { e: SearchEntry; s: number; i: number }[] = [];
  index.forEach((e, i) => {
    const s = score(e.keys, qs);
    if (s) scored.push({ e, s, i });
  });
  scored.sort((a, b) => b.s - a.s || a.i - b.i);
  return { hits: scored.slice(0, limit).map((x) => x.e), total: scored.length };
}
