"use client";

import { useEffect, useState } from "react";
import { useCardsStore } from "@/lib/cards-store";
import { useStore } from "@/lib/store";

export function HydrationBoundary({ children }: { children: React.ReactNode }) {
  const ready = useCardsStore((s) => s.ready);
  const error = useCardsStore((s) => s.error);
  const hydrate = useCardsStore((s) => s.hydrate);

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

  if (error) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center gap-5 p-8 text-center">
        <p
          className="text-caption text-[color:var(--accent-korean)] leading-relaxed"
          style={{ fontFamily: "var(--font-jp-sans)" }}
        >
          데이터를 불러올 수 없습니다.
          <br />
          <span className="text-[color:var(--fg-faint)]">{error}</span>
        </p>
        <button
          type="button"
          onClick={() => void hydrate()}
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
      <div
        className="min-h-full flex items-center justify-center text-caption text-[color:var(--fg-faint)]"
        style={{ letterSpacing: "0.25em" }}
      >
        ・・・
      </div>
    );
  }

  return <>{children}</>;
}
