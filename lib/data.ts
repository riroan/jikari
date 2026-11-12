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
import { seededShuffle } from "./prng";
import { normalizeKorean } from "./normalize";

export type QuizDirection = "recall" | "recognition";
/** 단어 퀴즈 전용: 한자만 보고 가나 읽기를 고르는 형식이 하나 더 있다. */
export type VocabDirection = QuizDirection | "reading";

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

/**
 * 문자열 모양이 얼마나 닮았나 (0–3). 품사/register 점수 위에 얹는 보조 점수다.
 * 정답만 유난히 길거나 짧고, 정답만 "~하다"로 끝나면 뜻을 몰라도 모양으로
 * 답이 갈린다. 길이가 비슷하면 +2(가깝게)/+1(조금 멀게), 끝 글자가 같으면 +1.
 * 하드 필터가 아니라서 점수가 같은 후보들 사이의 동점 해소로만 작동한다.
 */
export function shapeScore(correct: string, candidate: string): number {
  const d = Math.abs(correct.length - candidate.length);
  let score = 0;
  if (d <= Math.max(1, Math.round(correct.length * 0.15))) score += 2;
  else if (d <= Math.max(3, Math.round(correct.length * 0.3))) score += 1;
  if (correct.at(-1) === candidate.at(-1)) score += 1;
  return score;
}

/** 일본어 단어 모양: 한자 유무가 같으면 +1 (가나만인 정답에 한자 선지만 섞이는 것 방지). */
function hasKanji(text: string): boolean {
  return /\p{Script=Han}/u.test(text);
}

/**
 * 철자가 겹치는 정도 (0–2). 한자를 공유하거나(会社/会議) 첫·끝 글자가 같으면
 * 눈으로 헷갈리는 오답이다. 철자가 닮은 오답은 단순 무작위보다 학습 효과가
 * 있다는 보고가 있다 (유사 철자 선지: EDM 2025, Susanti 2018의 철자 유사도 순위).
 */
function orthographicScore(a: string, b: string): number {
  const kanjiA = new Set([...a].filter((c) => /\p{Script=Han}/u.test(c)));
  const sharesKanji = [...b].some((c) => kanjiA.has(c));
  let score = sharesKanji ? 1 : 0;
  if (a[0] === b[0] || a.at(-1) === b.at(-1)) score += 1;
  return score;
}

/**
 * 전에 이 카드에서 고른 오답(lib/confusion.ts)은 후보에 있으면 최대 2개까지 선지에
 * 확정으로 넣는다. 점수에 가산하면 4배 창의 무작위 추첨에 밀려 다시 안 나올 수 있다.
 * 정답은 호출 쪽이 이미 후보에서 뺀 상태여야 한다.
 */
function takePreferred<T>(
  prefer: readonly T[],
  candidates: readonly T[],
): { forced: T[]; rest: T[] } {
  const set = new Set(candidates);
  const forced = [...new Set(prefer)].filter((p) => set.has(p)).slice(0, 2);
  const taken = new Set(forced);
  return { forced, rest: candidates.filter((c) => !taken.has(c)) };
}

/** 난이도(JLPT 레벨)가 한 단계 안이면 +1. 빈도·난이도 유사도 순위의 근사. */
function levelScore(a: VocabCard, b: VocabCard): number {
  return Math.abs(a.jlptLevel - b.jlptLevel) <= 1 ? 1 : 0;
}

/** 같은 품사 버킷 후보에 가중치를 준 선지 3개. 양방향 単語 퀴즈 공용. */
function samePosDistractors(
  byLabel: Map<string, VocabCard>,
  pos: string,
  seed: number,
  shape: (label: string, card: VocabCard) => number,
  windowMult?: number,
  prefer: readonly string[] = [],
): string[] {
  const { forced, rest } = takePreferred(prefer, [...byLabel.keys()]);
  return [
    ...forced,
    ...sampleScored(
      rest,
      3 - forced.length,
      seed,
      (label) => (vocabPos(byLabel.get(label)!) === pos ? 3 : 0) + shape(label, byLabel.get(label)!),
      windowMult,
    ),
  ];
}

export function generateKanjiChoices(
  card: KanjiCard,
  questionType: "on" | "kun",
  seed: number = Math.random(),
  expected?: number,
  prefer: readonly string[] = [],
): { correct: string; choices: string[] } {
  const correctReadings = questionType === "on" ? card.onReadings : card.kunReadings;
  if (correctReadings.length === 0) {
    const fallback = questionType === "on" ? card.kunReadings : card.onReadings;
    if (fallback.length === 0) {
      return { correct: "?", choices: ["?", "?", "?", "?"] };
    }
    return generateKanjiChoices(card, questionType === "on" ? "kun" : "on", seed, expected, prefer);
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

  const readingScore = kanjiReadingScore(correct, questionType);
  const { forced, rest } = takePreferred(
    prefer,
    [...new Set(pool)].filter((r) => r !== correct),
  );
  const distractors = pickOffCenter(correct, (attempt) => [
    ...forced,
    ...sampleScored(
      rest,
      3 - forced.length,
      seed + attempt * 101,
      readingScore,
      windowForExpected(expected),
    ),
  ]);
  const choices = shuffle([correct, ...distractors], seed + 1);
  return { correct, choices };
}

/**
 * 선지가 전부 정답의 이웃(편집거리 1)이면 정답이 별 모양의 한가운데에 놓인다:
 * がく [かく, がい, はく] — "나머지와 가장 닮은 것"만 골라도 판독 없이 맞힌다
 * (시드 기준 기대 정답률 57%, 우연 25%). 몇 번 다시 뽑아서 정답이 유일한
 * 중심이 아닌 조합을 쓴다. 끝내 못 찾으면 그중 가장 덜 드러나는 조합.
 */
const OFF_CENTER_ATTEMPTS = 8;

function pickOffCenter(
  correct: string,
  draw: (attempt: number) => string[],
): string[] {
  let best: string[] = [];
  let bestTell = Infinity;
  for (let attempt = 0; attempt < OFF_CENTER_ATTEMPTS; attempt++) {
    const distractors = draw(attempt);
    const tell = centerTell(correct, distractors);
    if (tell < bestTell) {
      best = distractors;
      bestTell = tell;
    }
    if (tell === 0) break;
  }
  return best;
}

/**
 * "거리 합이 가장 작은 선지를 고른다" 전략이 정답을 맞힐 확률.
 * 정답이 유일한 중심이면 1, 다른 선지와 공동 중심이면 1/공동 수, 아니면 0.
 */
export function centerTell(correct: string, distractors: string[]): number {
  const choices = [correct, ...distractors];
  const sums = choices.map((c) =>
    choices.reduce((acc, other) => acc + kanaDistance(c, other), 0),
  );
  const min = Math.min(...sums);
  if (sums[0] !== min) return 0;
  return 1 / sums.filter((s) => s === min).length;
}

/** 영어 뜻의 비교용 키: 소문자, 괄호 설명 제거, 너무 짧은 것은 제외. */
function englishKeys(card: VocabCard): string[] {
  return (card.meanings ?? [])
    .map((m) =>
      m
        .toLowerCase()
        .replace(/\([^)]*\)/g, "")
        .trim()
        .replace(/^(to\s+)?(be\s+)?/, ""),
    )
    .filter((m) => m.length >= 3);
}

/** 읽기 문제가 성립하는 단어: 한자가 있고 읽기가 표기와 다르다. */
export function canAskReading(card: VocabCard): boolean {
  return hasKanji(card.word) && card.reading !== card.word;
}

/**
 * 한자 단어 → 가나 읽기 4지선다. 오답은 다른 한자 단어의 읽기 중 모라 수·
 * 편집거리·첫 글자가 닮은 것 (한자 읽기 선지와 같은 점수). 같은 표기를 공유하는
 * 단어(동음이의)의 읽기는 정답이 둘이 될 수 있어 뺀다.
 */
export function generateVocabReadingChoices(
  card: VocabCard,
  seed: number = Math.random(),
  expected?: number,
): { correct: string; choices: string[] } {
  const correct = card.reading;
  const sameWord = new Set(
    cards().vocab.filter((v) => v.word === card.word).map((v) => v.reading),
  );
  const pool = cards()
    .vocab.filter((v) => v.id !== card.id && canAskReading(v) && !sameWord.has(v.reading))
    .map((v) => v.reading);
  const score = kanjiReadingScore(correct, "kun");
  const distractors = pickOffCenter(correct, (attempt) =>
    sampleScored(pool, 3, seed + attempt * 101, score, windowForExpected(expected)),
  );
  return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
}

/**
 * 4-choice builder for 単語.
 *   recognition → question = JP word, choices = 한국어 뜻
 *   recall      → question = 한국어 뜻, choices = JP word (ruby 있으면 ruby 문자열)
 */
export function generateVocabChoices(
  card: VocabCard,
  direction: QuizDirection,
  seed: number = Math.random(),
  expected?: number,
  prefer: readonly string[] = [],
): { correct: string; choices: string[] } {
  const all = cards().vocab;
  // 뜻을 하나라도 공유하는 카드는 후보에서 뺀다. "알다"를 묻는데 分かる와
  // 知る가 함께 뜨면 정답이 둘이 된다.
  const meanings = new Set(card.koreanMeanings);
  // 한국어 표기가 달라도 영어 뜻이 겹치면 유의어다 ("알다"/"이해하다" 대신
  // understand/know처럼). 한국어 필터가 못 잡는 쌍을 영어 뜻으로 한 번 더 거른다.
  const english = new Set(englishKeys(card));
  const others = all.filter(
    (v) =>
      v.id !== card.id &&
      !v.koreanMeanings.some((m) => meanings.has(m)) &&
      !englishKeys(v).some((k) => english.has(k)),
  );

  if (direction === "recall") {
    const correct = card.ruby ?? card.word;
    // 표시 문자열 → 카드. 점수는 카드(품사)로 매기고 선지는 문자열로 낸다.
    const byLabel = new Map<string, VocabCard>();
    for (const v of others) {
      const label = v.ruby ?? v.word;
      if (label !== correct && !byLabel.has(label)) byLabel.set(label, v);
    }
    const distractors = samePosDistractors(
      byLabel,
      vocabPos(card),
      seed,
      (label, other) =>
        Math.min(2, shapeScore(card.word, other.word)) +
        (hasKanji(card.word) === hasKanji(other.word) ? 1 : 0) +
        orthographicScore(card.word, other.word) +
        levelScore(card, other),
      windowForExpected(expected),
      prefer,
    );
    return { correct, choices: shuffle([correct, ...distractors], seed + 1) };
  }

  // 뜻 선지도 같은 품사에서 뽑는다. 무작위로 뽑으면 "저것 / 닫다 / 끝나다 /
  // 책"처럼 뜻을 몰라도 품사만 보고 3개가 지워진다.
  const correct = card.koreanMeanings[0];
  const byMeaning = new Map<string, VocabCard>();
  for (const other of others) {
    for (const m of other.koreanMeanings) {
      if (!card.koreanMeanings.includes(m) && !byMeaning.has(m)) byMeaning.set(m, other);
    }
  }
  const distractors = samePosDistractors(
    byMeaning,
    vocabPos(card),
    seed,
    (label, other) => shapeScore(correct, label) + levelScore(card, other),
    windowForExpected(expected),
    prefer,
  );
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
  // 방어선: 시드 테스트가 걸러 주지만, 정답과 같거나 서로 같은 오답이 새어
  // 들어오면 화면에 같은 선지가 두 번 뜨고 정답이 둘로 보인다.
  const unique = [...new Set(distractors)].filter((d) => d !== correct);
  return { correct, choices: shuffle([correct, ...unique], seed) };
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
 * 한자 단어는 box 2부터 약 1/5을 읽기 문제로 낸다 (뜻·표기 문제와 번갈아).
 * 나머지는 기존 recall-first 규칙 그대로.
 */
export function pickVocabDirection(
  card: VocabCard,
  box: 1 | 2 | 3 | 4 | 5,
  epoch: number,
): VocabDirection {
  if (box >= 2 && canAskReading(card) && hashSeed(card.id, epoch + 31) % 5 === 0) return "reading";
  return chooseDirection(box, card.id, epoch);
}

/**
 * 4-choice builder for 일상표현.
 *   recall      → question = situation_ko, choices = expression_jp (ruby 포함)
 *   recognition → question = expression_jp, choices = translation_ko (한국어)
 *
 * 선지는 같은 register(말투) 카드에 가중치를 준다. 무작위로 뽑으면 존댓말
 * 정답에 반말 선지만 섞여 뜻을 몰라도 말투로 답이 갈린다. 하드 필터가 아니라
 * 점수라서 한 register가 얇아도 선지가 굶지 않는다 (sampleScored 참고).
 */
export function generateExpressionChoices(
  card: ExpressionCard,
  direction: QuizDirection,
  seed: number = Math.random(),
  expected?: number,
): { correct: string; choices: string[] } {
  // 여러 상황에서 같은 표현이나 같은 뜻을 쓸 수 있다. 그런 카드를 오답으로
  // 내면 정답이 둘이 된다. Ruby 표기가 달라도 원문이 같으면 같은 표현이다.
  const others = cards().expressions.filter((e) =>
    e.id !== card.id &&
    e.expression_jp !== card.expression_jp &&
    normalizeKorean(e.translation_ko) !== normalizeKorean(card.translation_ko),
  );
  const recall = direction === "recall";
  const correct = recall ? (card.ruby ?? card.expression_jp) : card.translation_ko;

  // 표시 문자열 → 카드. 점수는 카드(register)로 매기고 선지는 문자열로 낸다.
  const byLabel = new Map<string, ExpressionCard>();
  for (const e of others) {
    const label = recall ? (e.ruby ?? e.expression_jp) : e.translation_ko;
    if (label !== correct && !byLabel.has(label)) byLabel.set(label, e);
  }
  const distractors = sampleScored(
    [...byLabel.keys()],
    3,
    seed,
    (label) =>
      (byLabel.get(label)!.register === card.register ? 3 : 0) + shapeScore(correct, label),
    windowForExpected(expected),
  );
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

const DEFAULT_WINDOW = 4;

/**
 * 이 카드를 맞힐 것으로 기대되는 확률(lib/rating.ts expectedScore)에 따른 창 배수.
 * 잘 아는 카드(기대 정답률 높음)는 상위 점수 후보만 써서 오답을 닮게 하고,
 * 어려운 카드는 창을 넓혀 덜 닮은 오답도 섞는다 — 못 맞히는 카드에 가장
 * 헷갈리는 선지까지 얹으면 좌절만 쌓인다. 값을 안 주면 기본 창.
 */
export function windowForExpected(expected?: number): number {
  if (expected === undefined) return DEFAULT_WINDOW;
  if (expected >= 0.85) return 1.5;
  if (expected >= 0.7) return 2.5;
  if (expected >= 0.5) return DEFAULT_WINDOW;
  return 6;
}

/**
 * 듣기 문장 퀴즈의 번역 오답. 덱의 다른 문장 번역 중 길이·끝 글자가 정답과
 * 닮은 것을 우선한다 (무작위면 길이만 보고도 지워진다).
 */
export function pickTranslationDistractors(
  correct: string,
  others: string[],
  seed: number,
  n = 3,
): string[] {
  return sampleScored(
    others.filter((t) => t !== correct),
    n,
    seed,
    (t) => shapeScore(correct, t),
  );
}

/**
 * 점수 상위권에서 n개를 시드로 뽑는다.
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
  windowMult: number = DEFAULT_WINDOW,
): T[] {
  const uniquePool = Array.from(new Set(pool));
  if (uniquePool.length <= n) return uniquePool;
  // 정렬 전에 섞어야 동점 후보가 매번 같은 순서로 뽑히지 않는다
  // (Array#sort는 stable이라 동점이면 입력 순서가 그대로 남는다).
  const ranked = shuffle(uniquePool, seed)
    .map((value) => ({ value, weight: score(value) }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, Math.max(n, Math.round(n * windowMult)))
    .map((entry) => entry.value);
  return shuffle(ranked, seed + 7).slice(0, n);
}

const shuffle = seededShuffle;
