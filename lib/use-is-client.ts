"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns `true` once the component has mounted on the client.
 *
 * Replaces the common pattern:
 *
 *   const [mounted, setMounted] = useState(false);
 *   useEffect(() => setMounted(true), []);
 *
 * which trips eslint-plugin-react-hooks v7's `set-state-in-effect`
 * rule (cascading renders). Using `useSyncExternalStore` with a noop
 * subscribe is the React-blessed "have we hydrated" pattern: the SSR
 * snapshot is `false`, the client snapshot is `true`, and after the
 * first paint React swaps to the client value with no extra setState.
 */
const noopSubscribe = () => () => {};
const trueSnapshot = () => true;
const falseSnapshot = () => false;

export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    trueSnapshot,
    falseSnapshot,
  );
}

/**
 * Stable client-side `Date.now()` snapshot. Captured once per process
 * (module-level cache) so the value stays identical across renders —
 * useful for "today's date key" derivations where a re-rendering wall
 * clock would defeat memoization.
 *
 * SSR returns `null` so callers must guard. Reading wall time inside
 * `useSyncExternalStore`'s `getSnapshot` is the React-sanctioned escape
 * hatch and avoids tripping `react-hooks/no-impure-function-during-render`.
 */
let _cachedNow: number | null = null;
const getCachedNow = () => {
  if (_cachedNow === null) _cachedNow = Date.now();
  return _cachedNow;
};
const nullSnapshot = () => null;

export function useClientNow(): number | null {
  return useSyncExternalStore(noopSubscribe, getCachedNow, nullSnapshot);
}
