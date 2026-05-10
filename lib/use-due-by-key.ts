"use client";

import { useMemo } from "react";
import { useStore } from "./store";
import { useCardsStore } from "./cards-store";
import { useClientNow } from "./use-is-client";
import { aggregateDueByKey, type DueByKey } from "./due";

/**
 * Subscribes to learningStates + sentence/particle id sets and returns the
 * per-subject "review due now" map. Pure derivation lives in lib/due.ts;
 * this hook just wires the React reactive sources.
 *
 * Returns an empty object until the client clock is available
 * (useClientNow() === null on the server / before hydration).
 */
export function useDueByKey(): DueByKey {
  const learningStates = useStore((s) => s.learningStates);
  const sentenceIds = useCardsStore((s) => s.sentenceIds);
  const particleIds = useCardsStore((s) => s.particleIds);
  const now = useClientNow();
  return useMemo(() => {
    if (now === null) return {};
    return aggregateDueByKey(
      learningStates,
      now,
      new Set(sentenceIds),
      new Set(particleIds),
    );
  }, [learningStates, now, sentenceIds, particleIds]);
}
