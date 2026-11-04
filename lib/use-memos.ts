"use client";

import { useSyncExternalStore } from "react";
import { MEMOS_EVENT, MEMOS_KEY, loadMemos } from "./memos";

function snapshot(): string {
  try {
    return localStorage.getItem(MEMOS_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(MEMOS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(MEMOS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** key → 메모 텍스트. */
export function useMemos(): Map<string, string> {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return new Map(raw ? loadMemos().map((m) => [m.key, m.text]) : []);
}
