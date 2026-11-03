import { shuffleIds } from "./deck";
import { parseMarkup, stripMarkup } from "./jp-markup";
import type { ExpressionCard, SentenceCard } from "./types";

export interface ReadingItem {
  id: string;
  markup: string;
  ko: string;
}

const MAX_LEN = 40;
const RUBY = /\{[^|{}]+\|[^|{}]+\}/;

/** 한자(후리가나 마크업)가 하나라도 있는 문장만: 읽기 연습이 성립하는 카드. */
export function readingItems(
  sentences: readonly SentenceCard[],
  expressions: readonly ExpressionCard[],
): ReadingItem[] {
  const out: ReadingItem[] = [];
  const add = (id: string, markup: string, ko: string) => {
    if (RUBY.test(markup) && stripMarkup(parseMarkup(markup)).length <= MAX_LEN) out.push({ id, markup, ko });
  };
  for (const c of sentences)
    add(c.id, (c.sentenceRuby ?? c.sentence).replace("＿＿＿", c.blankRuby ?? c.blank), c.translation);
  for (const c of expressions) add(c.id, c.ruby ?? c.expression_jp, c.translation_ko);
  return out;
}

/** 약한 문장(틀렸거나 엿본 것)을 먼저, 나머지는 그 뒤에. 각각 시드 셔플. */
export function orderDeck(ids: readonly string[], weak: ReadonlySet<string>, seed: number): string[] {
  const w = ids.filter((i) => weak.has(i));
  const rest = ids.filter((i) => !weak.has(i));
  return [...shuffleIds(w, seed), ...shuffleIds(rest, seed + 1)];
}

/** 한 문장 결과 반영: 엿봤거나 틀리면 약함으로, 깨끗이 맞히면 해제. */
export function updateWeak(weak: ReadonlySet<string>, id: string, ok: boolean, peeked: boolean): Set<string> {
  const next = new Set(weak);
  if (ok && !peeked) next.delete(id);
  else next.add(id);
  return next;
}

const KEY = "jikari:reading-weak";

export function loadWeak(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function saveWeak(weak: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...weak]));
  } catch {
    // privacy mode: weak list just doesn't persist.
  }
}
