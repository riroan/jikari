"use client";

import { useSyncExternalStore } from "react";
import { getSyncStatus, subscribeSync } from "@/lib/remote-storage";

const TEXT = { pending: "저장 대기 중…", offline: "오프라인" } as const;

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
