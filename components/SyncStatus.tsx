"use client";

import { useSyncExternalStore } from "react";
import { getSyncStatus, subscribeSync } from "@/lib/remote-storage";

const TEXT = {
  pending: "저장 대기 중…",
  offline: "오프라인",
  "offline-queued": "오프라인 — 풀이는 저장돼요",
  snapshot: "오프라인으로 열었어요 — 저장된 기록으로 이어서 공부해요",
  failed: "저장 실패",
  "no-space": "저장 공간이 부족해요 — 연결되면 바로 저장해요",
} as const;

/** Quiet one-line save status, pinned to the bottom edge. Renders nothing when everything is saved. */
export function SyncStatus() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus, () => "idle" as const);
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
