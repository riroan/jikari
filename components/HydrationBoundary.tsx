"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useCardsStore } from "@/lib/cards-store";
import { getProgressLoadFailed, subscribeSync } from "@/lib/remote-storage";
import { useStore } from "@/lib/store";

export function HydrationBoundary({ children }: { children: React.ReactNode }) {
  const ready = useCardsStore((s) => s.ready);
  const error = useCardsStore((s) => s.error);
  const hydrate = useCardsStore((s) => s.hydrate);

  const progressFailed = useSyncExternalStore(subscribeSync, getProgressLoadFailed, () => false);

  const [progressHydrated, setProgressHydrated] = useState(() =>
    typeof window !== "undefined" && useStore.persist.hasHydrated()
  );

  useEffect(() => {
    void hydrate();
    // If hydration finished between the lazy-init snapshot and this
    // effect firing, the listener path below handles it — no
    // synchronous setState in the effect body (lint rule
    // react-hooks/set-state-in-effect).
    if (useStore.persist.hasHydrated()) return;
    const unsub = useStore.persist.onFinishHydration(() =>
      setProgressHydrated(true),
    );
    void useStore.persist.rehydrate();
    return unsub;
  }, [hydrate]);

  if (error || (progressFailed && progressHydrated)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 text-center">
        <p
          className="text-caption text-[color:var(--accent-korean)] leading-relaxed"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          데이터를 불러올 수 없습니다.
          <br />
          <span className="text-[color:var(--fg-faint)]">
            {error ?? "학습 기록을 가져오지 못했어요. 연결을 확인해 주세요."}
          </span>
        </p>
        <button
          type="button"
          onClick={() => {
            void hydrate();
            if (progressFailed) void useStore.persist.rehydrate();
          }}
          className="inline-flex items-center min-h-[44px] px-4 text-caption tracking-tab text-[color:var(--fg-soft)] border border-[color:var(--line)] rounded-sm hover:bg-[color:var(--bg-deep)] transition-colors"
          style={{ fontFamily: "var(--font-kr-sans)" }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!ready || !progressHydrated) {
    return (
      <div className="min-h-full w-full max-w-[390px] mx-auto px-6 pt-[calc(var(--safe-top)+2rem)]">
        <h1
          className="text-title leading-none font-semibold tracking-wide"
          style={{ fontFamily: "var(--font-jp-serif)" }}
        >
          jikari
        </h1>
      </div>
    );
  }

  return <>{children}</>;
}
