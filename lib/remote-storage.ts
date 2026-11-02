"use client";

import type { StateStorage } from "zustand/middleware";
import { backoffMs } from "./retry";

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: string | null = null;
let inFlight = false;
let failures = 0;
let loadFailed = false;
/** Last PUT was rejected permanently (4xx); cleared by the next write. */
let saveFailed = false;
/**
 * PUT replaces the whole server state (DELETE + INSERT). If the initial GET
 * failed, the store is running on its empty defaults, and saving that would
 * wipe every learning record. So nothing is written until a GET succeeds.
 */
let loaded = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** useSyncExternalStore pair: what the save status line shows. */
export function subscribeSync(cb: () => void) {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}
export type SyncStatus = "idle" | "pending" | "offline" | "failed";
export function getSyncStatus(): SyncStatus {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  if (pending != null || inFlight) return "pending";
  return saveFailed ? "failed" : "idle";
}
/** True when the initial progress GET failed (store is on empty defaults, saving is blocked). */
export function getProgressLoadFailed() {
  return loadFailed;
}

/** Test-only: reset module state between cases. */
export function __resetRemoteStorageForTests() {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
  inFlight = false;
  failures = 0;
  loadFailed = false;
  saveFailed = false;
  loaded = false;
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), ms);
}

async function flush() {
  timer = null;
  if (inFlight || pending == null) return;
  const value = pending;
  pending = null;
  inFlight = true;
  emit();
  try {
    const parsed = JSON.parse(value) as { state: unknown };
    const res = await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.state),
    });
    if (!res.ok) {
      const retryable = res.status < 400 || res.status >= 500 || [401, 403, 408, 429].includes(res.status);
      if (retryable) throw new Error(`HTTP ${res.status}`);
      // Permanent rejection: retrying the same payload can never succeed. Drop it.
      console.error(`[remote-storage] PUT rejected (HTTP ${res.status}), dropping payload`);
      saveFailed = true;
      failures = 0;
      if (pending != null) schedule(0);
      return;
    }
    failures = 0;
    saveFailed = false;
    if (pending != null) schedule(0); // newer state arrived mid-flight
  } catch (err) {
    console.error("[remote-storage] PUT failed, will retry:", err);
    if (pending == null) pending = value; // keep the data; a newer value wins
    schedule(backoffMs(++failures));
  } finally {
    inFlight = false;
    emit();
  }
}

/** Retry now (network came back / app foregrounded). */
function kick() {
  if (pending != null && !inFlight) schedule(0);
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", kick);
  window.addEventListener("offline", emit);
  document.addEventListener("visibilitychange", kick);
}

export const remoteStorage: StateStorage = {
  getItem: async (_name) => {
    try {
      const res = await fetch("/api/progress", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const state = (await res.json()) as { schemaVersion?: number };
      loaded = true;
      loadFailed = false;
      emit();
      return JSON.stringify({ state, version: state.schemaVersion ?? 0 });
    } catch (err) {
      console.error("[remote-storage] GET failed:", err);
      loadFailed = true;
      emit();
      return null;
    }
  },
  setItem: (_name, value) => {
    if (!loaded) {
      console.warn("[remote-storage] progress never loaded — not saving over the server copy");
      return;
    }
    pending = value;
    saveFailed = false;
    if (failures === 0) schedule(500); // during an outage keep the backoff timer
    emit();
  },
  removeItem: async (_name) => {
    // No-op: server-side reset is handled by PUT of initial empty state via the store's reset action.
  },
};
