/**
 * 혼동 기록: 어떤 오답을 골랐는지 기기 로컬(localStorage)에 남겨, 같은 카드를 다시
 * 풀 때 그 오답을 선지에 우선 올린다. 자주 헷갈리는 쌍을 반복해서 마주하게 하는
 * 장치라 DB 스키마는 건드리지 않는다. 오답을 고르면 +1, 맞히면 모든 항목 -1
 * (0이 되면 삭제) — 헷갈림이 풀리면 자연스럽게 사라진다.
 */
export const CONFUSION_KEY = "jikari-confusion-v1";
export const CONFUSION_CAP = 400;
const PER_CARD_CAP = 6;

type Store = Record<string, Record<string, number>>;

function load(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(window.localStorage.getItem(CONFUSION_KEY) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Store) : {};
  } catch {
    return {};
  }
}

function save(store: Store): void {
  try {
    const keys = Object.keys(store);
    // 삽입 순서가 곧 최신순이 되도록 쓸 때마다 다시 꽂는다 → 넘치면 오래된 것부터 버린다.
    for (const k of keys.slice(0, Math.max(0, keys.length - CONFUSION_CAP))) delete store[k];
    window.localStorage.setItem(CONFUSION_KEY, JSON.stringify(store));
  } catch {
    /* 저장 불가(프라이빗 모드 등)여도 퀴즈는 그대로 */
  }
}

/** 이 카드에서 자주 고른 오답 라벨, 많이 고른 순. */
export function preferredFor(cardKey: string): string[] {
  const entry = load()[cardKey];
  if (!entry) return [];
  return Object.entries(entry)
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label)
    .slice(0, PER_CARD_CAP);
}

/** 한 번 푼 결과를 반영한다. `wrongPick`은 틀렸을 때 고른 선지. */
export function settleConfusion(cardKey: string, correct: boolean, wrongPick?: string): void {
  const store = load();
  const entry = { ...(store[cardKey] ?? {}) };
  if (correct) {
    for (const label of Object.keys(entry)) {
      if (entry[label] <= 1) delete entry[label];
      else entry[label] -= 1;
    }
  } else if (wrongPick) {
    entry[wrongPick] = (entry[wrongPick] ?? 0) + 1;
  } else {
    return; // 타이핑 오답 등 고른 선지가 없으면 기록할 게 없다
  }
  delete store[cardKey];
  if (Object.keys(entry).length > 0) store[cardKey] = entry; // 맨 뒤 = 최신
  save(store);
}
