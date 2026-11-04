/** 내 연상 메모: 기기 로컬(localStorage). cardKey(`mode:cardId`) → 한 줄 메모. */
import { useSyncExternalStore } from "react";

export const MEMOS_KEY = "jikari-memos-v1";
export const MEMOS_CAP = 200;
export const MEMO_MAX = 80;
const EVENT = "jikari-memos";

export interface Memo {
  key: string;
  text: string;
  at: number;
}

/** 검증·정규화: localStorage와 백업 가져오기가 같은 규칙을 쓴다. 빈 메모 제거, 80자·CAP 적용. */
export function normalizeMemos(raw: unknown): Memo[] {
  return Array.isArray(raw)
    ? raw
        .filter((m): m is Memo => !!m && typeof m.key === "string" && typeof m.text === "string" && Number.isFinite(m.at))
        .map((m) => ({ key: m.key, text: [...m.text.trim()].slice(0, MEMO_MAX).join(""), at: m.at }))
        .filter((m) => m.text)
        .sort((a, b) => b.at - a.at)
        .slice(0, MEMOS_CAP)
    : [];
}

export function loadMemos(): Memo[] {
  try {
    return normalizeMemos(JSON.parse(localStorage.getItem(MEMOS_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export function saveMemos(list: Memo[]): void {
  try {
    localStorage.setItem(MEMOS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // 저장소 불가: 메모만 남지 않는다.
  }
}

/** 순수: 빈 문자열이면 삭제, 80자 초과는 자름, CAP 초과분은 가장 오래된 것부터 버린다. */
export function applyMemo(list: readonly Memo[], key: string, text: string, now: number): Memo[] {
  const t = [...text.trim()].slice(0, MEMO_MAX).join("");
  const rest = list.filter((m) => m.key !== key);
  if (!t) return rest;
  return [...rest, { key, text: t, at: now }].sort((a, b) => b.at - a.at).slice(0, MEMOS_CAP);
}

export function setMemo(key: string, text: string, now = Date.now()): void {
  try {
    localStorage.setItem(MEMOS_KEY, JSON.stringify(applyMemo(loadMemos(), key, text, now)));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // 저장소 불가: 메모만 남지 않는다.
  }
}

function snapshot(): string {
  try {
    return localStorage.getItem(MEMOS_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** key → 메모 텍스트. */
export function useMemos(): Map<string, string> {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return new Map(raw ? loadMemos().map((m) => [m.key, m.text]) : []);
}
