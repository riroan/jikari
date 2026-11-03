/**
 * 오답 노트: 기기 로컬 오답 로그. DB 스키마는 건드리지 않고 localStorage에만 둔다.
 * 키는 cardKey(`mode:cardId`)로 중복 제거, 누적 틀린 횟수와 마지막 시각을 유지.
 * 이어서 CLEAR_AFTER번 연속 맞히면 로그에서 빠진다.
 */
export const MISSES_KEY = "jikari-misses-v1";
export const MISSES_CAP = 300;
export const CLEAR_AFTER = 2;
export const MISSES_EVENT = "jikari-misses";

export interface Miss {
  key: string;
  count: number;
  /** 마지막 오답 이후 연속 정답 수 */
  ok: number;
  last: number;
}

/** 퀴즈 카드로 다시 풀 수 있는 모드만 기록한다. */
const LOGGED = new Set(["kanji", "vocab", "sentence", "grammar", "expression"]);

export function loadMisses(): Miss[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MISSES_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (m): m is Miss =>
            !!m && typeof m.key === "string" && Number.isFinite(m.count) && Number.isFinite(m.last),
        ).map((m) => ({ ...m, ok: Number.isFinite(m.ok) ? m.ok : 0 }))
      : [];
  } catch {
    return [];
  }
}

export function saveMisses(list: Miss[]): void {
  try {
    localStorage.setItem(MISSES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(MISSES_EVENT));
  } catch {
    // 저장소 불가(프라이빗 모드·용량): 로그만 남지 않는다.
  }
}

/** 순수: 한 번의 답을 로그에 반영. 최신순 정렬, CAP 초과분은 가장 오래된 것부터 버린다. */
export function applyAnswer(list: readonly Miss[], key: string, correct: boolean, now: number): Miss[] {
  const prev = list.find((m) => m.key === key);
  if (!prev && correct) return list as Miss[];
  const rest = list.filter((m) => m.key !== key);
  if (correct) {
    const ok = prev!.ok + 1;
    return ok >= CLEAR_AFTER ? rest : [...rest, { ...prev!, ok }].sort(byLast);
  }
  return [...rest, { key, count: (prev?.count ?? 0) + 1, ok: 0, last: now }]
    .sort(byLast)
    .slice(0, MISSES_CAP);
}

const byLast = (a: Miss, b: Miss) => b.last - a.last;

/** store.review에서 호출: 모든 퀴즈 경로의 단일 기록 지점. */
export function recordMissAnswer(mode: string, cardId: string, correct: boolean, now = Date.now()): void {
  if (!LOGGED.has(mode)) return;
  const list = loadMisses();
  const next = applyAnswer(list, `${mode}:${cardId}`, correct, now);
  if (next !== list) saveMisses(next);
}

export function removeMiss(key: string): void {
  saveMisses(loadMisses().filter((m) => m.key !== key));
}

export function restoreMiss(m: Miss): void {
  saveMisses([...loadMisses().filter((x) => x.key !== m.key), m].sort(byLast).slice(0, MISSES_CAP));
}

/** 오늘 / 이번 주(최근 7일) / 이전 — 로컬 자정 기준. */
export function groupByRecency(list: readonly Miss[], now: number): Array<{ label: string; items: Miss[] }> {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const today = d.getTime();
  const week = today - 6 * 86_400_000;
  const groups = [
    { label: "오늘", items: list.filter((m) => m.last >= today) },
    { label: "이번 주", items: list.filter((m) => m.last < today && m.last >= week) },
    { label: "이전", items: list.filter((m) => m.last < week) },
  ];
  return groups.filter((g) => g.items.length > 0);
}
