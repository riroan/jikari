"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getSyncStatus, subscribeSync } from "@/lib/remote-storage";

const TEXT = {
  offline: "오프라인",
  "offline-queued": "오프라인 — 풀이는 저장돼요",
  snapshot: "오프라인으로 열었어요 — 저장된 기록으로 이어서 공부해요",
  failed: "저장 실패",
  "no-space": "저장 공간이 부족해요 — 연결되면 바로 저장해요",
} as const;

/** Quiet one-line save status, pinned to the bottom edge. Renders nothing when everything is saved. */
export function SyncStatus() {
  const raw = useSyncExternalStore(subscribeSync, getSyncStatus, () => "idle" as const);
  // 답할 때마다 잠깐 뜨는 "저장 대기 중"은 소음 — 문제가 있을 때(오프라인·실패)만 알린다.
  const status = raw === "pending" ? "idle" : raw;
  // 고정된 이 줄이 페이지 맨 아래 버튼과 겹치지 않게, 떠 있는 동안 셸이
  // 아래 여백을 늘리도록 표식을 단다 (globals.css --sync-gap).
  useEffect(() => {
    const root = document.documentElement;
    if (status === "idle") delete root.dataset.sync;
    else root.dataset.sync = status;
    return () => {
      delete root.dataset.sync;
    };
  }, [status]);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(var(--safe-bottom)+0.5rem)]"
    >
      {status !== "idle" && (
        <span
          className="text-caption text-[color:var(--fg-faint)]"
          style={{ fontFamily: "var(--font-kr-sans)" }}
        >
          {TEXT[status]}
        </span>
      )}
    </div>
  );
}
