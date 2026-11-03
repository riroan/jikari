"use client";

import { useSyncExternalStore } from "react";
import { MISSES_EVENT, MISSES_KEY, loadMisses, type Miss } from "./misses";

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
