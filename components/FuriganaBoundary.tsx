"use client";

import { useIsClient } from "@/lib/use-is-client";
import { FuriganaProvider } from "./Furigana";
import { useStore } from "@/lib/store";

/**
 * Client boundary that reads showFurigana from the store and provides it
 * to all RubyText/Furigana descendants.
 *
 * Before mount, defaults to true (SSR-safe: beginner-friendly default).
 */
export function FuriganaBoundary({ children }: { children: React.ReactNode }) {
  const mounted = useIsClient();
  const show = useStore((s) => s.settings.showFurigana);
  return (
    <FuriganaProvider show={mounted ? show : true}>{children}</FuriganaProvider>
  );
}
