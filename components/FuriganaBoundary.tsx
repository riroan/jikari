"use client";

import { useEffect, useState } from "react";
import { FuriganaProvider } from "./Furigana";
import { useStore } from "@/lib/store";

/**
 * Client boundary that reads showFurigana from the store and provides it
 * to all RubyText/Furigana descendants.
 *
 * Before mount, defaults to true (SSR-safe: beginner-friendly default).
 */
export function FuriganaBoundary({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const show = useStore((s) => s.settings.showFurigana);
  return (
    <FuriganaProvider show={mounted ? show : true}>{children}</FuriganaProvider>
  );
}
