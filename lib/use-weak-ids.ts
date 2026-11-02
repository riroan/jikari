"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "./store";
import { weakCardIds } from "./weak";
import type { CardMode } from "./types";

/**
 * `?weak=1` on a quiz page → the frozen list of weak card ids (snapshot at
 * mount, so the deck doesn't shrink as answers land). Null = normal deck,
 * including when nothing is weak.
 */
export function useWeakIds(mode: CardMode, pool: readonly string[]): string[] | null {
  const on = useSearchParams().get("weak") === "1";
  const [ids] = useState(() => {
    if (!on) return null;
    const ids = weakCardIds(useStore.getState().learningStates, mode, new Set(pool));
    return ids.length > 0 ? ids : null;
  });
  return ids;
}
