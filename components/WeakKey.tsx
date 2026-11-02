"use client";

import { useSearchParams } from "next/navigation";

/** ?weak 값이 바뀌면 자식을 다시 마운트 — 약점 덱 스냅샷이 mount 시점에 고정돼서. */
export function WeakKey({ children }: { children: React.ReactNode }) {
  const weak = useSearchParams().get("weak");
  return <div key={weak ?? ""} className="contents">{children}</div>;
}

export function WeakEmptyNotice() {
  return (
    <p className="mb-4 text-caption text-[color:var(--fg-faint)]">
      약점 카드가 없어요. 전체 덱으로 진행해요
    </p>
  );
}
