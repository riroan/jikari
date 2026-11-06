import type { ExpressionCard } from "./types";

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

function prevKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const p = new Date(y, m - 1, d - 1);
  return `${p.getFullYear()}-${String(p.getMonth() + 1).padStart(2, "0")}-${String(p.getDate()).padStart(2, "0")}`;
}

/**
 * 오늘의 출처: 0 = 일상표현, k = 보유한 k번째 한마디 팩. 날짜 해시라 하루 동안 고정.
 * 팩이 없으면 언제나 0.
 */
export function pickDailySource(sourceCount: number, dateKey: string): number {
  return sourceCount <= 1 ? 0 : hash(`${dateKey}:src`) % sourceCount;
}

/** 오늘의 한마디: dateKey(YYYY-MM-DD, 로컬)로 결정적 선택. 어제와 같은 카드는 피한다. */
export function pickDailyPhrase<T = ExpressionCard>(
  cards: readonly T[],
  dateKey: string,
): T | null {
  const n = cards.length;
  if (n === 0) return null;
  const i = hash(dateKey) % n;
  if (n === 1) return cards[0];
  return cards[i === hash(prevKey(dateKey)) % n ? (i + 1) % n : i];
}
