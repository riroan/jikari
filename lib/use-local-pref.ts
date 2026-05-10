"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed UI preference. Values stay device-local
 * and don't round-trip through the remote progress store — appropriate
 * for ergonomic toggles (sort order, panel collapse state, etc.) where
 * losing the choice on a different device is acceptable.
 *
 * The setter triggers a synthetic 'storage' event so multiple components
 * subscribed to the same key stay in sync within the same tab (the
 * native `storage` event only fires on cross-tab updates).
 */
export function useLocalPref<T extends string>(
  key: string,
  fallback: T,
  isValid: (raw: string) => raw is T,
): [T, (next: T) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key || e.key === null) cb();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    try {
      const raw = localStorage.getItem(key);
      if (raw !== null && isValid(raw)) return raw;
    } catch {
      // localStorage may throw in privacy modes — treat as fallback.
    }
    return fallback;
  }, [key, fallback, isValid]);

  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        return;
      }
      // Same-tab notify (native 'storage' only fires across tabs).
      window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: next }),
      );
    },
    [key],
  );

  return [value, setValue];
}
