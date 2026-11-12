import { seededRandom } from "./prng";

/**
 * 숫자 듣기 — 가격·시각·날짜·조수사를 시드로 무한 생성한다. 읽기(가나)를 직접 만들어
 * TTS에 넘긴다: 숫자 그대로 넘기면 기기마다 읽는 법이 달라 정답 공개의 읽기와 어긋날 수 있다.
 * 오답은 귀로 헷갈리는 쪽(ろっぴゃく/はっぴゃく, よっか/ようか, ふつか/はつか…)을 먼저 고른다.
 */
export type NumKind = "price" | "time" | "date" | "counter";
export const NUM_KINDS: readonly NumKind[] = ["price", "time", "date", "counter"];

export interface NumQuiz {
  kind: NumKind;
  /** 화면 표기 (3,580円 · 7時15分 · 4月8日 · 3本) */
  answer: string;
  /** TTS가 읽을 가나 */
  reading: string;
  /** 오답 3개 (표기) */
  distractors: string[];
  /** 정답 공개 때 덧붙일 설명 (조수사 뜻 등) */
  note?: string;
}

// ---------- 수 읽기 ----------------------------------------------------------

const ONES = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
const TENS = ["", "じゅう", "にじゅう", "さんじゅう", "よんじゅう", "ごじゅう", "ろくじゅう", "ななじゅう", "はちじゅう", "きゅうじゅう"];
const HUNDREDS = ["", "ひゃく", "にひゃく", "さんびゃく", "よんひゃく", "ごひゃく", "ろっぴゃく", "ななひゃく", "はっぴゃく", "きゅうひゃく"];
const THOUSANDS = ["", "せん", "にせん", "さんぜん", "よんせん", "ごせん", "ろくせん", "ななせん", "はっせん", "きゅうせん"];

function under10000(n: number): string {
  return (
    THOUSANDS[Math.floor(n / 1000) % 10] +
    HUNDREDS[Math.floor(n / 100) % 10] +
    TENS[Math.floor(n / 10) % 10] +
    ONES[n % 10]
  );
}

/** 1 ≤ n < 1억. */
export function readNumber(n: number): string {
  const man = Math.floor(n / 10000);
  return (man ? under10000(man) + "まん" : "") + under10000(n % 10000);
}

export function readYen(n: number): string {
  // 4円은 よえん.
  return (readNumber(n) + "えん").replace(/よんえん$/, "よえん");
}

const HOURS = ["", "いちじ", "にじ", "さんじ", "よじ", "ごじ", "ろくじ", "しちじ", "はちじ", "くじ", "じゅうじ", "じゅういちじ", "じゅうにじ"];
const MIN_ONES = ["", "いっぷん", "にふん", "さんぷん", "よんぷん", "ごふん", "ろっぷん", "ななふん", "はっぷん", "きゅうふん"];
const MIN_TENS_ONLY = ["", "じゅっぷん", "にじゅっぷん", "さんじゅっぷん", "よんじゅっぷん", "ごじゅっぷん"];

export function readTime(h: number, m: number): string {
  if (m === 0) return HOURS[h];
  const t = Math.floor(m / 10);
  const o = m % 10;
  return HOURS[h] + (o === 0 ? MIN_TENS_ONLY[t] : TENS[t] + MIN_ONES[o]);
}

const MONTHS = ["", "いちがつ", "にがつ", "さんがつ", "しがつ", "ごがつ", "ろくがつ", "しちがつ", "はちがつ", "くがつ", "じゅうがつ", "じゅういちがつ", "じゅうにがつ"];
const SPECIAL_DAYS: Record<number, string> = {
  1: "ついたち", 2: "ふつか", 3: "みっか", 4: "よっか", 5: "いつか", 6: "むいか", 7: "なのか",
  8: "ようか", 9: "ここのか", 10: "とおか", 14: "じゅうよっか", 20: "はつか", 24: "にじゅうよっか",
};

export function readDay(d: number): string {
  if (SPECIAL_DAYS[d]) return SPECIAL_DAYS[d];
  const t = Math.floor(d / 10);
  const o = d % 10;
  // 17·19·27·29일은 しち·く로 읽는다.
  const one = o === 7 ? "しち" : o === 9 ? "く" : ONES[o];
  return TENS[t] + one + "にち";
}

export const readDate = (mo: number, d: number) => MONTHS[mo] + readDay(d);

const COUNTERS: Record<string, { ko: string; readings: string[] }> = {
  本: { ko: "길쭉한 것 (병·연필)", readings: ["いっぽん", "にほん", "さんぼん", "よんほん", "ごほん", "ろっぽん", "ななほん", "はっぽん", "きゅうほん", "じゅっぽん"] },
  匹: { ko: "작은 동물", readings: ["いっぴき", "にひき", "さんびき", "よんひき", "ごひき", "ろっぴき", "ななひき", "はっぴき", "きゅうひき", "じゅっぴき"] },
  杯: { ko: "잔·그릇", readings: ["いっぱい", "にはい", "さんばい", "よんはい", "ごはい", "ろっぱい", "ななはい", "はっぱい", "きゅうはい", "じゅっぱい"] },
  人: { ko: "사람", readings: ["ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", "ななにん", "はちにん", "きゅうにん", "じゅうにん"] },
  つ: { ko: "물건 (일반)", readings: ["ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ"] },
  階: { ko: "층", readings: ["いっかい", "にかい", "さんがい", "よんかい", "ごかい", "ろっかい", "ななかい", "はっかい", "きゅうかい", "じゅっかい"] },
};
const COUNTER_KEYS = Object.keys(COUNTERS);

// ---------- 헷갈리는 짝 ------------------------------------------------------

/** 귀로 헷갈리는 숫자 (いち/しち/はち, ろく/はち, よん/なな …). */
const DIGIT_CONF: Record<string, string[]> = {
  "1": ["7", "8"], "2": ["5"], "3": ["6", "8"], "4": ["7", "8"], "5": ["2", "9"],
  "6": ["8", "3"], "7": ["1", "4"], "8": ["6", "1"], "9": ["5", "7"],
};
const DAY_CONF: Record<number, number[]> = {
  1: [7, 11], 2: [20, 12], 3: [6, 13], 4: [8, 14, 24], 5: [9, 15], 6: [3, 16], 7: [1, 17],
  8: [4, 18], 9: [5, 19], 10: [20, 11], 14: [24, 4], 20: [2, 22], 24: [14, 4],
};
const MONTH_CONF: Record<number, number[]> = { 1: [7], 4: [7], 7: [4, 1], 9: [7], 6: [8], 8: [6] };
const COUNT_CONF: Record<number, number[]> = {
  1: [8, 6], 2: [1], 3: [6, 8], 4: [8, 7], 5: [9], 6: [3, 8], 7: [4, 1], 8: [6, 1, 4], 9: [5], 10: [1, 8],
};

/** 자릿수 교환 + 헷갈리는 숫자 치환으로 만든 이웃 수. */
function digitNeighbours(n: number): number[] {
  const s = String(n);
  const out: number[] = [];
  for (let i = 0; i + 1 < s.length; i++) {
    if (s[i] === s[i + 1]) continue;
    const t = s.slice(0, i) + s[i + 1] + s[i] + s.slice(i + 2);
    if (t[0] !== "0") out.push(Number(t));
  }
  for (let i = 0; i < s.length; i++)
    for (const c of DIGIT_CONF[s[i]] ?? []) out.push(Number(s.slice(0, i) + c + s.slice(i + 1)));
  return out;
}

/** 후보를 섞어 정답과 다른 표기 3개. 모자라면 fallback으로 채운다. */
function pick3(answer: string, candidates: string[], fallback: () => string, rnd: () => number): string[] {
  const pool = [...new Set(candidates)].filter((c) => c !== answer);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const out = pool.slice(0, 3);
  for (let guard = 0; out.length < 3 && guard < 50; guard++) {
    const f = fallback();
    if (f !== answer && !out.includes(f)) out.push(f);
  }
  return out;
}

const int = (rnd: () => number, lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
const yen = (n: number) => `${n.toLocaleString("en-US")}円`;
const clock = (h: number, m: number) => (m === 0 ? `${h}時` : `${h}時${m}分`);
const DAYS_IN = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

// ---------- 생성 -------------------------------------------------------------

export function makeNumQuiz(kind: NumKind, seed: number): NumQuiz {
  const rnd = seededRandom(seed);
  switch (kind) {
    case "price": {
      const band = int(rnd, 0, 2);
      const n = band === 0 ? int(rnd, 10, 99) * 10 : band === 1 ? int(rnd, 100, 999) * 10 : int(rnd, 100, 999) * 100;
      const answer = yen(n);
      const near = digitNeighbours(n).filter((x) => x > 0 && x < 1e8).map(yen);
      return { kind, answer, reading: readYen(n), distractors: pick3(answer, near, () => yen(n + int(rnd, -9, 9) * (band === 2 ? 100 : 10)), rnd) };
    }
    case "time": {
      const h = int(rnd, 1, 12);
      const m = rnd() < 0.2 ? 0 : int(rnd, 1, 59);
      const answer = clock(h, m);
      const cands: string[] = [];
      for (const x of digitNeighbours(m)) if (x < 60) cands.push(clock(h, x));
      if (m % 10 && Math.floor(m / 10) !== m % 10 && (m % 10) * 10 + Math.floor(m / 10) < 60)
        cands.push(clock(h, (m % 10) * 10 + Math.floor(m / 10))); // 14분 ↔ 41분
      for (const x of digitNeighbours(h)) if (x >= 1 && x <= 12) cands.push(clock(x, m));
      return { kind, answer, reading: readTime(h, m), distractors: pick3(answer, cands, () => clock(h, int(rnd, 1, 59)), rnd) };
    }
    case "date": {
      const mo = int(rnd, 1, 12);
      // 절반은 특수 읽기 날짜(ついたち·よっか·はつか…)에서 뽑는다.
      const special = Object.keys(SPECIAL_DAYS).map(Number);
      const d = rnd() < 0.5 ? special[int(rnd, 0, special.length - 1)] : int(rnd, 1, DAYS_IN[mo]);
      const show = (a: number, b: number) => `${a}月${b}日`;
      const answer = show(mo, d);
      const cands = [
        ...(DAY_CONF[d] ?? []).filter((x) => x <= DAYS_IN[mo]).map((x) => show(mo, x)),
        ...(MONTH_CONF[mo] ?? []).filter((x) => d <= DAYS_IN[x]).map((x) => show(x, d)),
      ];
      return { kind, answer, reading: readDate(mo, d), distractors: pick3(answer, cands, () => show(mo, int(rnd, 1, DAYS_IN[mo])), rnd) };
    }
    case "counter": {
      const key = COUNTER_KEYS[int(rnd, 0, COUNTER_KEYS.length - 1)];
      const { ko, readings } = COUNTERS[key];
      const n = int(rnd, 1, readings.length);
      const show = (x: number) => `${x}${key}`;
      const answer = show(n);
      const cands = (COUNT_CONF[n] ?? []).filter((x) => x <= readings.length).map(show);
      return {
        kind,
        answer,
        reading: readings[n - 1],
        distractors: pick3(answer, cands, () => show(int(rnd, 1, readings.length)), rnd),
        note: `${key} — ${ko}`,
      };
    }
  }
}
