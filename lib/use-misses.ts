"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useCardsStore } from "./cards-store";
import { MISSES_EVENT, MISSES_KEY, loadMisses, missCard, type Miss } from "./misses";

const EMPTY: Miss[] = [];
let cache: { raw: string | null; list: Miss[] } = { raw: null, list: EMPTY };

function snapshot(): Miss[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(MISSES_KEY);
  } catch {}
  if (raw !== cache.raw) cache = { raw, list: raw ? loadMisses() : EMPTY };
  return cache.list;
}

function subscribe(cb: () => void) {
  window.addEventListener(MISSES_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MISSES_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** 로그 구독 (서버/하이드레이션 전에는 빈 배열). */
export function useMisses(): Miss[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** 데이터에 아직 있는 카드의 오답만 (카드 데이터가 준비되기 전에는 빈 배열). /mistakes 목록과 홈 개수의 기준. */
export function useLiveMisses(): Miss[] {
  const ready = useCardsStore((s) => s.ready);
  const misses = useMisses();
  return useMemo(() => (ready ? misses.filter((m) => missCard(m.key)) : EMPTY), [ready, misses]);
}
