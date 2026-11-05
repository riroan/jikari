import { segmentSentence } from "./build-chunks";
import { shuffleIds } from "./deck";
import { parseMarkup, stripMarkup } from "./jp-markup";
import type { ExpressionCard, SentenceCard } from "./types";

export interface BuildItem {
  id: string;
  /** 후리가나 마크업이 붙은 완성 문장 (chunks.join("") === markup). */
  markup: string;
  chunks: string[];
  /** 한국어 뜻 */
  ko: string;
}

/** 빈칸을 정답으로 채운 문장 + 표현 카드 중 3–7청크로 쪼개지는 것만 (조사 분리 모드는 minChunks=2로 받아 조각 수를 다시 센다). */
export function buildItems(
  sentences: readonly SentenceCard[],
  expressions: readonly ExpressionCard[],
  minChunks?: number,
): BuildItem[] {
  const out: BuildItem[] = [];
  const add = (id: string, markup: string, ko: string) => {
    const chunks = segmentSentence(markup, minChunks);
    if (chunks) out.push({ id, markup, chunks, ko });
  };
  for (const c of sentences) {
    const m = (c.sentenceRuby ?? c.sentence).replace("＿＿＿", c.blankRuby ?? c.blank);
    add(c.id, m, c.translation);
  }
  for (const c of expressions) add(c.id, c.ruby ?? c.expression_jp, c.translation_ko);
  return out;
}

const plain = (c: string) => stripMarkup(parseMarkup(c));
const PARTICLES = "はがをにでともへの";
/** 청크 끝 조사 (뒤 읽점 제외). 조사로 안 끝나면 "". */
const endParticle = (c: string) => {
  const last = [...plain(c).replace(/[、，,]$/u, "")].pop() ?? "";
  return PARTICLES.includes(last) ? last : "";
};

/**
 * 어려움 모드용 함정 조각: 다른 카드의 청크 중, 정답 문장의 조사 청크와 "다른 조사"로 끝나는 것을 우선한다.
 * 문장 안 어떤 청크와도 글자가 같거나 문장 속에 들어 있지 않다 (그러면 대신 써도 정답이 될 수 있다). 같은 seed면 같은 결과.
 */
export function pickDistractors(item: BuildItem, all: readonly BuildItem[], seed: number): string[] {
  const own = new Set(item.chunks.map(plain));
  const pool = [...new Set(all.filter((o) => o.id !== item.id).flatMap((o) => o.chunks))]
    .filter((c) => !own.has(plain(c)) && !plain(item.markup).includes(plain(c)))
    .sort();
  const shuffled = shuffleIds(pool, seed);
  const want = item.chunks.length >= 5 ? 2 : 1;
  const ownParticles = new Set(item.chunks.map(endParticle).filter(Boolean));
  const out: string[] = [];
  const take = (ok: (c: string) => boolean) => {
    for (const c of shuffled) {
      if (out.length >= want) return;
      if (!out.includes(c) && !out.some((o) => plain(o) === plain(c)) && ok(c)) out.push(c);
    }
  };
  // 1순위: 정답에 없는 조사로 끝나는 조각 (은/를 자리에 が 같은 헷갈림), 2순위: 아무 조사 조각, 3순위: 아무거나.
  take((c) => !!endParticle(c) && !ownParticles.has(endParticle(c)));
  take((c) => !!endParticle(c));
  take(() => true);
  return out;
}

// ─────────────────────────────────────────────────────────────
// 조사 분리 모드: 단어 조각과 조사 조각을 따로 놓고, 쓰지 않는 조사 조각을 섞는다.
// ─────────────────────────────────────────────────────────────

const SPLIT_PARTICLES = "はがをにでともへの";
/** 앞이 가나일 때는 단어 내부(ので, だけど…) 오탐을 피해 이 셋만 자른다 (segmentSentence와 같은 규칙). */
const SPLIT_AFTER_KANA = "はがを";
const UNIT = /\{[^|{}]+\|[^|{}]+\}|[\s\S]/gu;

/** 한 글자 조사 하나로 끝나는 청크를 [단어, 조사]로 가른다. 못 가르면 그대로. */
export function splitParticle(chunk: string): string[] {
  const units = chunk.match(UNIT) ?? [];
  if (units.length < 2) return [chunk];
  const last = units[units.length - 1];
  const prev = units[units.length - 2];
  if (last.length !== 1 || !SPLIT_PARTICLES.includes(last)) return [chunk];
  const prevIsKana = !prev.startsWith("{") && !/[一-鿿々゠-ヿ]/u.test(prev);
  if (prevIsKana && !SPLIT_AFTER_KANA.includes(last)) return [chunk];
  return [units.slice(0, -1).join(""), last];
}

export const isParticleTile = (tile: string) => tile.length === 1 && SPLIT_PARTICLES.includes(tile);

/** 문장 전체를 단어/조사 조각으로 풀어 낸다. 이어 붙이면 원문과 같다. */
export function splitItem(item: BuildItem): BuildItem {
  return { ...item, chunks: item.chunks.flatMap(splitParticle) };
}

/**
 * 문장에 한 번도 나오지 않는 조사 조각 n개 (같은 seed면 같은 결과).
 * 문장에 이미 있는 조사는 뽑지 않는다 — 있는 조사를 더 주면 어느 쪽이 맞는지
 * 문장만으로는 가를 수 없는 경우가 생긴다.
 */
export function pickParticleDistractors(item: BuildItem, seed: number, n = 2): string[] {
  const used = new Set(item.chunks.filter(isParticleTile));
  const pool = [...SPLIT_PARTICLES].filter((p) => !used.has(p) && p !== "の");
  return shuffleIds(pool, seed).slice(0, n);
}
