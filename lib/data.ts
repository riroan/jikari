import type {
  ExpressionCard,
  GrammarCard,
  GrammarPatternQuiz,
  KanjiCard,
  ParticleContrastQuiz,
  SentenceCard,
  VocabCard,
} from "./types";
import { useCardsStore } from "./cards-store";

export type QuizDirection = "recall" | "recognition";

function cards() {
  return useCardsStore.getState();
}

export function getKanji(id: string): KanjiCard | undefined {
  return cards().kanjiById.get(id);
}

export function getVocab(id: string): VocabCard | undefined {
  return cards().vocabById.get(id);
}

export function getSentence(id: string): SentenceCard | undefined {
  return cards().sentenceById.get(id);
}

export function getGrammar(id: string): GrammarCard | undefined {
  return cards().grammarById.get(id);
}

export function getExpression(id: string): ExpressionCard | undefined {
  return cards().expressionById.get(id);
}

/**
 * Look up ruby markup for a word. Tries:
 *   1. Exact match on word (食べる → "{食|た}べる")
 *   2. Conjugation match — trim common Japanese verb suffixes and retry
 *      (飲んだ → 飲む → "{飲|の}む")
 *   3. Fall back to the word as-is (no ruby).
 */
function wordToRuby(word: string): string {
  const byWord = cards().vocabByWord;

  const direct = byWord.get(word);
  if (direct?.ruby) return direct.ruby;
  if (direct) return word;

  const conjugations: Array<[RegExp, string]> = [
    [/んだ$/, "む"],
    [/いた$/, "く"],
    [/った$/, "る"],
    [/ました$/, "る"],
    [/って$/, "る"],
    [/て$/, "る"],
    [/た$/, "る"],
  ];
  for (const [suffixPattern, replacement] of conjugations) {
    if (!suffixPattern.test(word)) continue;
    const dictForm = word.replace(suffixPattern, replacement);
    const candidate = byWord.get(dictForm);
    if (candidate?.ruby) {
      const dictSuffix = replacement;
      const conjSuffix = word.slice(dictForm.length - dictSuffix.length);
      return candidate.ruby.slice(0, candidate.ruby.length - dictSuffix.length) + conjSuffix;
    }
  }

  for (const [suffixPattern, replacement] of [
    [/った$/, "う"],
    [/って$/, "う"],
  ] as const) {
    if (!suffixPattern.test(word)) continue;
    const dictForm = word.replace(suffixPattern, replacement);
    const candidate = byWord.get(dictForm);
    if (candidate?.ruby) {
      const conjSuffix = word.slice(dictForm.length - replacement.length);
      return (
        candidate.ruby.slice(0, candidate.ruby.length - replacement.length) + conjSuffix
      );
    }
  }

  return word;
}

// ─────────────────────────────────────────────────────────────
// Distractor scoring
//
// 균등 랜덤 풀은 길이나 품사만 보고 배제되는 선지를 뽑는다. 아래 점수로
// 정답과 닮은 후보에 가중치를 주되 하드 필터는 쓰지 않는다 — 얇은 버킷
// (1모라 음독, い형용사 훈독 39개)에서 풀이 말라 선지가 4개 미만이 된다.
// ─────────────────────────────────────────────────────────────

const SMALL_KANA = /[ぁぃぅぇぉゃゅょゎ]/g;

/** 모라 수. 拗音은 앞 가나와 묶어 한 모라로 센다 — きょう=2, こう=2. */
export function moraCount(kana: string): number {
  return kana.length - (kana.match(SMALL_KANA)?.length ?? 0);
}

/**
 * 가나 편집거리. 한국어 화자의 실제 오답축이 전부 거리 1로 잡힌다:
 * 장음(こう/こく), 탁음(はい/ばい), 촉음(かく/がく), 요음(しょ/しょう).
 */
export function kanaDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

/**
 * 훈독 어미 버킷 — 전체형(なく / はしる / わるい)으로 저장하기 때문에 가능하다.
 *
 * 언어학적으로 정확할 필요는 없다. 정답과 후보를 같은 규칙에 통과시키므로
 * 일관되기만 하면 버킷으로 기능한다 (夜=よる가 "동사"로 분류돼도 무해 —
 * 그 선지들도 같이 る로 끝난다).
 */
export function readingShape(reading: string): "v" | "i" | "n" {
  if (/[うくぐすつぬぶむる]$/.test(reading)) return "v";
  if (/い$/.test(reading)) return "i";
  return "n";
}

function kanjiReadingScore(
  correct: string,
  questionType: "on" | "kun",
): (candidate: string) => number {
  const mora = moraCount(correct);
  const shape = readingShape(correct);
  return (candidate) => {
    let score = 0;
    if (moraCount(candidate) === mora) score += 3;
    if (kanaDistance(candidate, correct) <= 1) score += 2;
    if (candidate[0] === correct[0]) score += 1;
    // 음독은 품사 개념이 없다 — 훈독에만 적용.
    if (questionType === "kun" && readingShape(candidate) === shape) score += 3;
    return score;
  };
}

/** 単語 recall 방향의 품사 버킷. 추측이 아니라 백필된 컬럼을 쓴다. */
function vocabPos(card: VocabCard): string {
  if (card.verbGroup && card.verbGroup !== "not_verb") return card.verbGroup;
  if (card.adjGroup && card.adjGroup !== "not_adj") return card.adjGroup;
  return "other";
}

export function generateKanjiChoices(
  card: KanjiCard,
  questionType: "on" | "kun",
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correctReadings = questionType === "on" ? card.onReadings : card.kunReadings;
  if (correctReadings.length === 0) {
    const fallback = questionType === "on" ? card.kunReadings : card.onReadings;
    if (fallback.length === 0) {
      return { correct: "?", choices: ["?", "?", "?", "?"] };
    }
    return generateKanjiChoices(card, questionType === "on" ? "kun" : "on", seed);
  }
  const correct = correctReadings[0];

  const all = cards().kanji;
  // 이 한자의 판독은 음/훈 양쪽 다 배제한다. 음독 문제에 이 한자의 훈독이
  // 오답으로 뜨면 "틀렸다"고 말하기 어렵다.
  const ownReadings = new Set([...card.onReadings, ...card.kunReadings]);
  const pool: string[] = [];
  for (const other of all) {
    if (other.id === card.id) continue;
    const otherReadings = questionType === "on" ? other.onReadings : other.kunReadings;
    for (const r of otherReadings) {
      if (r && !ownReadings.has(r)) {
        pool.push(r);
      }
    }
  }

  const distractors = sampleScored(
    pool,
    3,
    seed,
    kanjiReadingScore(correct, questionType),
  );
  const choices = shuffle([correct, ...distractors], seed + 1);
  return { correct, choices };
}

/**
 * 4-choice builder for 単語.
 *   recognition → question = JP word, choices = 한국어 뜻
 *   recall      → question = 한국어 뜻, choices = JP word (ruby 있으면 ruby 문자열)
 */
export function generateVocabChoices(
  card: VocabCard,
  direction: QuizDirection,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const all = cards().vocab;
  const others = all.filter((v) => v.id !== card.id);

  if (direction === "recall") {
    const correct = card.ruby ?? card.word;
    // 표시 문자열 → 카드. 점수는 카드(품사)로 매기고 선지는 문자열로 낸다.
    const byLabel = new Map<string, VocabCard>();
    for (const v of others) {
      const label = v.ruby ?? v.word;
      if (label !== correct && !byLabel.has(label)) byLabel.set(label, v);
    }
    const pos = vocabPos(card);
    const distractors = sampleScored([...byLabel.keys()], 3, seed, (label) =>
      vocabPos(byLabel.get(label)!) === pos ? 3 : 0,
    );
    return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
  }

  const correct = card.koreanMeanings[0];
  const pool: string[] = [];
  for (const other of others) {
    for (const m of other.koreanMeanings) {
      if (!card.koreanMeanings.includes(m)) pool.push(m);
    }
  }
  const distractors = sampleUnique(pool, 3, seed);
  return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
}

/**
 * Shared 4-choice builder. Shuffles `[correct, ...distractors]` with a
 * stable seed and returns the same `{ correct, choices }` shape every
 * quiz-flavored mode uses.
 */
export function generateChoices(
  correct: string,
  distractors: string[],
  seed: number = Math.random(),
): { correct: string; choices: string[] } {
  return { correct, choices: shuffle([correct, ...distractors], seed) };
}

export function generateSentenceChoices(
  card: SentenceCard,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  const correct = card.blankRuby ?? wordToRuby(card.blank);
  const distractorsRuby = card.distractors.map(wordToRuby);
  return generateChoices(correct, distractorsRuby, seed);
}

/**
 * Deterministic 32-bit-ish hash of (id, epoch) for direction toggling.
 * Used only for display/UX branching — not cryptographic.
 */
export function hashSeed(id: string, epoch: number): number {
  let h = 2166136261 ^ epoch;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Direction toggle for 일상표현 퀴즈 — recall-first 80/20 (post /plan-eng-review).
 *   box ≤ 1 → `recognition` (warm-up for new cards, 진입 장벽 완화)
 *   box ≥ 2 → 80% recall / 20% recognition, hash-stable within an epoch
 *
 * This subject's unique value is 상황 → 표현 recall. 50/50 would halve that.
 */
export function chooseDirection(
  box: 1 | 2 | 3 | 4 | 5,
  id: string,
  epoch: number,
): QuizDirection {
  if (box <= 1) return "recognition";
  return hashSeed(id, epoch) % 10 < 8 ? "recall" : "recognition";
}

/**
 * 4-choice builder for 일상표현.
 *   recall      → question = situation_ko, choices = expression_jp (ruby 포함)
 *   recognition → question = expression_jp, choices = translation_ko (한국어)
 * Distractor pool is the entire deck minus the correct card (v1 simplification
 * per /plan-eng-review — same-register 규칙은 seed 50+에서 재도입).
 */
export function generateExpressionChoices(
  card: ExpressionCard,
  direction: QuizDirection,
  seed: number = Math.random(),
): { correct: string; choices: string[] } {
  const all = cards().expressions;
  const others = all.filter((e) => e.id !== card.id);

  if (direction === "recall") {
    const correct = card.ruby ?? card.expression_jp;
    const pool = others.map((e) => e.ruby ?? e.expression_jp);
    const distractors = sampleUnique(pool, 3, seed);
    return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
  }

  // recognition
  const correct = card.translation_ko;
  const pool = others
    .map((e) => e.translation_ko)
    .filter((t) => t !== correct);
  const distractors = sampleUnique(pool, 3, seed);
  return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
}

/**
 * Grammar quiz 4-choice — both pattern and particle_contrast quiz shapes
 * already carry `correct` + `distractors: string[]`, so this is a thin
 * wrapper over `generateChoices`. Exported as a named function so grammar
 * callsites don't poke the generic helper directly.
 */
export function generateGrammarQuizChoices(
  quiz: GrammarPatternQuiz | ParticleContrastQuiz,
  seed: number = Math.random()
): { correct: string; choices: string[] } {
  return generateChoices(quiz.correct, quiz.distractors, seed);
}

// ─────────────────────────────────────────────────────────────
// Pure helpers (seed-based for test stability)
// ─────────────────────────────────────────────────────────────

function sampleUnique<T>(pool: T[], n: number, seed: number): T[] {
  const uniquePool = Array.from(new Set(pool));
  const shuffled = shuffle(uniquePool, seed);
  return shuffled.slice(0, n);
}

/**
 * 점수 상위권에서 n개를 시드로 뽑는다. `sampleUnique`의 가중치 버전.
 *
 * 상위 n개를 그대로 쓰지 않고 4배 창(window)을 두는 이유: 에폭이 바뀌어도
 * 같은 선지 3개만 반복되면 판독이 아니라 선지 배열을 외우게 된다.
 * 풀이 n 이하로 얇으면 점수를 무시하고 있는 걸 다 준다 — 하드 필터와 달리
 * 선지 개수가 모자랄 일이 없다.
 */
function sampleScored<T>(
  pool: T[],
  n: number,
  seed: number,
  score: (candidate: T) => number,
): T[] {
  const uniquePool = Array.from(new Set(pool));
  if (uniquePool.length <= n) return uniquePool;
  // 정렬 전에 섞어야 동점 후보가 매번 같은 순서로 뽑히지 않는다
  // (Array#sort는 stable이라 동점이면 입력 순서가 그대로 남는다).
  const ranked = shuffle(uniquePool, seed)
    .map((value) => ({ value, weight: score(value) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, n * 4)
    .map((entry) => entry.value);
  return shuffle(ranked, seed + 7).slice(0, n);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const j = Math.floor(r * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

