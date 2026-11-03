import type { LearningState } from "./types";

export type MixSubject =
  | "kanji" | "vocab" | "sentence" | "particle"
  | "conjugation" | "adjective" | "grammar" | "expression";

export const MIX_SUBJECTS: ReadonlyArray<{ id: MixSubject; ko: string; jp: string }> = [
  { id: "kanji", ko: "한자", jp: "漢字" },
  { id: "vocab", ko: "단어", jp: "単語" },
  { id: "sentence", ko: "문장", jp: "文章" },
  { id: "particle", ko: "조사", jp: "助詞" },
  { id: "conjugation", ko: "동사활용", jp: "活用" },
  { id: "adjective", ko: "형용사", jp: "形容詞" },
  { id: "grammar", ko: "문법", jp: "文法" },
  { id: "expression", ko: "일상표현", jp: "表現" },
];

export const MIX_LENGTHS = [10, 20, 30] as const;

export interface MixItem {
  subject: MixSubject;
  id: string;
}

function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 약한 정도 가중치. 한 번도 안 맞힌 것(상태 없음/복습 기록 없음)이 가장 크고,
 * 낮은 box일수록, 방금 틀렸으면(streak 0) 더 크다.
 */
export function weakWeight(s: LearningState | undefined): number {
  if (!s || s.lastReviewed === 0) return 8;
  return 6 - s.box + (s.correctStreak === 0 ? 2 : 0);
}

/** 가중 비복원 추출 (Efraimidis–Spirakis): weight 큰 것이 앞에 올 확률이 높다. */
function sample(ids: string[], k: number, weight: ((id: string) => number) | null, rand: () => number): string[] {
  const keyed = ids.map((id) => ({ id, key: weight ? rand() ** (1 / Math.max(weight(id), 0.01)) : rand() }));
  keyed.sort((a, b) => b.key - a.key);
  return keyed.slice(0, k).map((x) => x.id);
}

/**
 * 종합 퀴즈 덱. 켜진 과목 중 카드가 있는 곳에 문항 수를 고르게 나누고(작은 풀은 그만큼만,
 * 남는 몫은 다른 과목이 채움), 과목 안에서는 weight로 약한 것 위주(없으면 균등) 추출한 뒤,
 * 같은 과목이 연달아 나오지 않게(피할 수 있으면) 번갈아 줄 세운다. seed가 같으면 결과도 같다.
 */
export function buildMixDeck(opts: {
  pools: Partial<Record<MixSubject, readonly string[]>>;
  subjects: readonly MixSubject[];
  length: number;
  seed: number;
  /** 주어지면 약한 것 우선 추출. 생략하면 균등. */
  weight?: (subject: MixSubject, id: string) => number;
}): MixItem[] {
  const rand = rng(opts.seed);
  const pools = new Map(opts.subjects.map((s) => [s, [...new Set(opts.pools[s] ?? [])]]));
  const lanes = opts.subjects
    .filter((s) => pools.get(s)!.length > 0)
    .map((s) => ({ s, cap: pools.get(s)!.length, take: 0 }));
  const total = Math.min(opts.length, lanes.reduce((n, l) => n + l.cap, 0));
  // 한 장씩 돌아가며 몫을 나눈다.
  for (let given = 0; given < total; ) {
    for (const l of lanes) {
      if (given < total && l.take < l.cap) { l.take++; given++; }
    }
  }
  const queues = lanes
    .map((l) => ({
      s: l.s,
      q: sample(
        pools.get(l.s)!,
        l.take,
        opts.weight ? (id) => opts.weight!(l.s, id) : null,
        rand,
      ),
    }))
    .filter((l) => l.q.length > 0);

  const out: MixItem[] = [];
  let last: MixSubject | null = null;
  while (queues.some((l) => l.q.length > 0)) {
    const live = queues.filter((l) => l.q.length > 0);
    const options = live.filter((l) => l.s !== last);
    const pool = options.length ? options : live;
    const most = Math.max(...pool.map((l) => l.q.length));
    const top = pool.filter((l) => l.q.length === most);
    const pick = top[Math.floor(rand() * top.length)];
    out.push({ subject: pick.s, id: pick.q.shift()! });
    last = pick.s;
  }
  return out;
}

/** 과목+카드 → learningStates 키 (각 과목 자기 페이지가 쓰는 키와 같다). 활용/형용사는 형마다 키가 달라 해당 없음. */
export function mixStateKey(subject: Exclude<MixSubject, "conjugation" | "adjective">, id: string, grammarSub?: "pattern" | "particle"): string {
  switch (subject) {
    case "sentence":
    case "particle":
      return `sentence:${id}`;
    case "grammar":
      return `grammar:${grammarSub ?? "particle"}:${id}`;
    default:
      return `${subject}:${id}`;
  }
}
