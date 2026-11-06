/**
 * 포인트·급단(級段)·보상. 문제를 맞힐 때 생기는 값 하나가 두 곳에 쌓인다:
 *   xp     — 평생 누적, 줄지 않음 → 급단
 *   points — xp - spent, 보상에 쓰는 잔액
 * ELO(rating)가 "실력"(오르내림)이라면 이건 "노력"(쌓이기만)이다. 순수 함수만 — store가 부른다.
 */
import { keyDaysAgo, toLocalDateKey } from "./heatmap";
import type { HeatmapData } from "./types";

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface LedgerEntry {
  at: number;
  label: string;
  cost: number;
}

export interface Progression {
  xp: number;
  spent: number;
  /** 보유한 휴식권 (0..FREEZE_MAX). */
  freezes: number;
  /** 휴식권이 지켜 준 날 (YYYY-MM-DD) — 연속 학습 계산에서 공부한 날로 친다. */
  frozenDays: string[];
  /** 해금한 색 테마 id. */
  palettes: string[];
  /** 적용 중인 색 테마 ("" = 기본). */
  palette: string;
  /** 내가 정한 보상 목록. */
  rewards: Reward[];
  /** 지운 보상 id (병합에서 되살아나지 않게). */
  removed: string[];
  /** 포인트 사용 내역, 최신순. */
  ledger: LedgerEntry[];
  /** 급단 index → 처음 도달한 시각. */
  rankAt: Record<string, number>;
  /** 반복 적립 방지: dayCounts는 `day` 하루 동안 카드별 정답 수. */
  day: string;
  dayCounts: Record<string, number>;
  /** 하루 목표 보너스 / 7일 연속 보너스를 마지막으로 받은 날. */
  bonusDay: string;
  streakDay: string;
}

export const DEFAULT_PROGRESSION: Progression = {
  xp: 0,
  spent: 0,
  freezes: 0,
  frozenDays: [],
  palettes: [],
  palette: "",
  rewards: [],
  removed: [],
  ledger: [],
  rankAt: {},
  day: "",
  dayCounts: {},
  bonusDay: "",
  streakDay: "",
};

/** 저장본(서버 JSON·옛 상태)을 빈 칸 없이 채운다. */
export function normalizeProgression(raw: unknown): Progression {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<Progression>;
  return { ...DEFAULT_PROGRESSION, ...p };
}

// ---------- 적립 ----------------------------------------------------------

export const EARN = {
  choice: 1,
  typed: 2,
  due: 1,
  mastered: 5,
  dailyGoal: 20,
  week: 50,
  /** 같은 카드는 하루 이만큼까지만 적립 (무한 모드 반복 방지). */
  perCardPerDay: 2,
} as const;

export interface AnswerContext {
  /** 반복 판정용 카드 키 (cardKey). */
  key: string;
  correct: boolean;
  typed: boolean;
  /** 복습 예정이던 카드 (새 카드 제외). */
  wasDue: boolean;
  /** 이번 정답으로 5단계에 처음 올라감. */
  mastered: boolean;
  /** 오늘 푼 문제 수 (이번 것 포함). 0이면 하루 목표 보너스 판정 안 함. */
  todayCount: number;
  dailyGoal: number;
  /** 이번 답 이후의 연속 학습 일수. */
  streak: number;
  now: number;
}

export function earn(p: Progression, c: AnswerContext): Progression {
  if (!c.correct) return p;
  const day = toLocalDateKey(c.now);
  const dayCounts = p.day === day ? { ...p.dayCounts } : {};
  const n = dayCounts[c.key] ?? 0;
  dayCounts[c.key] = n + 1;

  let gained = 0;
  if (n < EARN.perCardPerDay) {
    gained += c.typed ? EARN.typed : EARN.choice;
    if (c.wasDue) gained += EARN.due;
    if (c.mastered) gained += EARN.mastered;
  }
  let { bonusDay, streakDay } = p;
  if (c.todayCount > 0 && c.todayCount >= c.dailyGoal && bonusDay !== day) {
    gained += EARN.dailyGoal;
    bonusDay = day;
  }
  if (c.streak > 0 && c.streak % 7 === 0 && streakDay !== day) {
    gained += EARN.week;
    streakDay = day;
  }

  const xp = p.xp + gained;
  const rankAt = { ...p.rankAt };
  for (let i = 0; i <= rankOf(xp).index; i++) if (!(i in rankAt)) rankAt[i] = c.now;
  return { ...p, xp, day, dayCounts, bonusDay, streakDay, rankAt };
}

// ---------- 급단 ----------------------------------------------------------

/** 하루 150pt 기준: 1級 약 2달, 初段 약 3달, 그 뒤 한 단에 약 한 달. */
export const RANKS: readonly { name: string; xp: number }[] = [
  { name: "10級", xp: 0 },
  { name: "9級", xp: 150 },
  { name: "8級", xp: 400 },
  { name: "7級", xp: 800 },
  { name: "6級", xp: 1400 },
  { name: "5級", xp: 2200 },
  { name: "4級", xp: 3300 },
  { name: "3級", xp: 4700 },
  { name: "2級", xp: 6500 },
  { name: "1級", xp: 9000 },
  { name: "初段", xp: 12000 },
  { name: "二段", xp: 16000 },
  { name: "三段", xp: 20500 },
  { name: "四段", xp: 25500 },
  { name: "五段", xp: 31000 },
  { name: "六段", xp: 37000 },
  { name: "七段", xp: 43500 },
  { name: "八段", xp: 50500 },
  { name: "九段", xp: 58000 },
  { name: "十段", xp: 66000 },
];

export function rankOf(xp: number) {
  let index = 0;
  while (index + 1 < RANKS.length && xp >= RANKS[index + 1].xp) index++;
  return { index, name: RANKS[index].name, floor: RANKS[index].xp, next: RANKS[index + 1] ?? null };
}

// ---------- 휴식권 --------------------------------------------------------

/**
 * 공부를 다시 시작한 날(또는 화면 표시 시점)에 빈 날을 휴식권으로 메운다.
 * 빈 날이 보유 장수보다 많으면 아무것도 쓰지 않는다 (어차피 끊긴 연속이라 낭비).
 */
export function consumeFreezes(p: Progression, heatmap: HeatmapData, now: number): Progression {
  if (p.freezes <= 0) return p;
  const gap: string[] = [];
  for (let i = 1; i <= p.freezes + 1; i++) {
    const k = keyDaysAgo(now, i);
    if ((heatmap[k] ?? 0) > 0 || p.frozenDays.includes(k)) break;
    gap.push(k);
  }
  if (gap.length === 0 || gap.length > p.freezes) return p;
  return {
    ...p,
    freezes: p.freezes - gap.length,
    frozenDays: [...p.frozenDays, ...gap].slice(-60),
  };
}

// ---------- 상점 ----------------------------------------------------------

export const FREEZE_COST = 200;
export const FREEZE_MAX = 2;
export const PALETTE_COST = 1500;
/** swatch = globals.css의 --pal 값 (구매 전 미리보기용). */
export const PALETTES = [
  { id: "sakura", jp: "桜", ko: "벚꽃", swatch: "#D79AA2" },
  { id: "wakaba", jp: "若葉", ko: "새잎", swatch: "#9DB86A" },
  { id: "momiji", jp: "紅葉", ko: "단풍", swatch: "#D98B57" },
  { id: "yuki", jp: "雪", ko: "겨울", swatch: "#8FA6C2" },
] as const;

export const pointsOf = (p: Progression) => p.xp - p.spent;

function spend(p: Progression, cost: number, label: string, now: number): Progression | null {
  if (cost <= 0 || pointsOf(p) < cost) return null;
  return {
    ...p,
    spent: p.spent + cost,
    ledger: [{ at: now, label, cost }, ...p.ledger].slice(0, 100),
  };
}

/** 각 구매 함수는 살 수 없으면(잔액 부족·이미 보유) null. */
export function buyFreeze(p: Progression, now: number): Progression | null {
  if (p.freezes >= FREEZE_MAX) return null;
  const s = spend(p, FREEZE_COST, "휴식권", now);
  return s && { ...s, freezes: s.freezes + 1 };
}

export function unlockPalette(p: Progression, id: string, now: number): Progression | null {
  const pal = PALETTES.find((x) => x.id === id);
  if (!pal || p.palettes.includes(id)) return null;
  const s = spend(p, PALETTE_COST, `색 테마 ${pal.jp}`, now);
  return s && { ...s, palettes: [...s.palettes, id], palette: id };
}

export function redeemReward(p: Progression, id: string, now: number): Progression | null {
  const r = p.rewards.find((x) => x.id === id);
  return r ? spend(p, r.cost, r.name, now) : null;
}

/** 서버 검증(lib/import progressionSchema)과 같은 상한 — 넘으면 진행 저장 전체가 400으로 막힌다. */
export const REWARDS_MAX = 100;
const REMOVED_MAX = 200;

export function addReward(p: Progression, name: string, cost: number, now: number): Progression | null {
  const n = name.trim().slice(0, 60);
  if (!n || !Number.isInteger(cost) || cost <= 0 || cost > 1_000_000) return null;
  if (p.rewards.length >= REWARDS_MAX) return null;
  return { ...p, rewards: [...p.rewards, { id: String(now), name: n, cost }] };
}

/** 지운 id는 `removed`에 남겨 기기 간 병합에서 되살아나지 않게 한다. */
export function removeReward(p: Progression, id: string): Progression {
  return {
    ...p,
    rewards: p.rewards.filter((r) => r.id !== id),
    removed: [...p.removed.filter((x) => x !== id), id].slice(-REMOVED_MAX),
  };
}

export function setPalette(p: Progression, id: string): Progression {
  return id === "" || p.palettes.includes(id) ? { ...p, palette: id } : p;
}

// ---------- 기기 간 병합 ----------------------------------------------------

/**
 * 서버 사본과 로컬(오프라인·충돌) 사본 병합. 어느 쪽도 되돌리지 않는다:
 * - xp·spent: 각각 max (둘 다 늘기만 하는 누적값). 양쪽이 따로 적립했다면 적은 쪽 적립분은
 *   잃는다 — merge-state의 quizStats max와 같은 타협. 구매는 환불되지 않는다.
 * - 사용 내역·해금·휴식권으로 메운 날·도달 기록: 합집합.
 * - 휴식권 장수: 더 많이 쓴(spent 큰) 쪽 — 그쪽이 구매를 반영한다. 같으면 적은 쪽(사용 반영).
 * - 보상: 합집합에서 어느 쪽이든 지운 것(`removed`)은 뺀다.
 * - 적용 중인 색 테마: 로컬 선택(사용자의 마지막 조작)이 이긴다, 해금된 것이라면.
 * - 반복 적립 카운터·보너스 날짜: xp가 큰 쪽.
 */
export function mergeProgression(server?: Progression, local?: Progression): Progression | undefined {
  if (!server || !local) return server ?? local;
  const union = (x: string[], y: string[]) => [...new Set([...x, ...y])];
  const ahead = local.xp > server.xp ? local : server;
  const spender =
    local.spent !== server.spent
      ? (local.spent > server.spent ? local : server)
      : (local.freezes <= server.freezes ? local : server);
  const rankAt = { ...server.rankAt };
  for (const [k, v] of Object.entries(local.rankAt)) rankAt[k] = k in rankAt ? Math.min(rankAt[k], v) : v;
  const removed = union(server.removed, local.removed).slice(-REMOVED_MAX);
  const rewards = [...server.rewards, ...local.rewards.filter((r) => !server.rewards.some((s) => s.id === r.id))]
    .filter((r) => !removed.includes(r.id))
    .slice(0, REWARDS_MAX);
  const ledger = [...server.ledger, ...local.ledger]
    .filter((l, i, all) => all.findIndex((m) => m.at === l.at && m.label === l.label) === i)
    .sort((x, y) => y.at - x.at)
    .slice(0, 100);
  const palettes = union(server.palettes, local.palettes);
  return {
    ...ahead,
    xp: Math.max(server.xp, local.xp),
    spent: Math.max(server.spent, local.spent),
    freezes: spender.freezes,
    frozenDays: union(server.frozenDays, local.frozenDays).sort().slice(-60),
    palettes,
    palette: local.palette === "" || palettes.includes(local.palette) ? local.palette : server.palette,
    rewards,
    removed,
    ledger,
    rankAt,
  };
}
