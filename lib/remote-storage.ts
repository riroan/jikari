"use client";

import type { StateStorage } from "zustand/middleware";
import { backoffMs } from "./retry";
import { mergeState } from "./merge-state";
import type { PersistedState } from "./types";

/**
 * Durable copy of the not-yet-saved write, so closing the app offline loses nothing.
 * Versioned key; envelope = { v, base (server settings it was based on), value (zustand JSON) }.
 */
const PENDING_KEY = "jikari-pending-v1";
const REJECTED_KEY = "jikari-pending-rejected-v1";
type Envelope = { v: 1; base?: PersistedState["settings"]; value: string };
let storedPending: boolean | null = null; // cached "a pending copy exists in localStorage"
let baseSettings: PersistedState["settings"] | undefined;

function readEnvelope(): Envelope | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (raw == null) return null;
    const env = JSON.parse(raw) as Envelope;
    if (env?.v !== 1 || typeof env.value !== "string") return null;
    return env;
  } catch {
    return null;
  }
}
function writeEnvelope(value: string) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ v: 1, base: baseSettings, value } satisfies Envelope));
    storedPending = true;
  } catch (err) {
    // quota / private mode: in-memory pending still retries; durability is best-effort
    console.warn("[remote-storage] could not persist pending write:", err);
  }
}
function clearEnvelope() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
  storedPending = false;
}
function hasStoredPending(): boolean {
  if (storedPending == null) {
    try {
      storedPending = typeof localStorage !== "undefined" && localStorage.getItem(PENDING_KEY) != null;
    } catch {
      storedPending = false;
    }
  }
  return storedPending;
}

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
  if (pending != null || inFlight || hasStoredPending()) return "pending";
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
  storedPending = null;
  baseSettings = undefined;
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
      // keep the rejected payload for manual recovery instead of re-merging it on every load
      try {
        const env = localStorage.getItem(PENDING_KEY);
        if (env != null && pending == null) localStorage.setItem(REJECTED_KEY, env);
      } catch {}
      if (pending == null) clearEnvelope();
      if (pending != null) schedule(0);
      return;
    }
    failures = 0;
    saveFailed = false;
    baseSettings = (parsed.state as Partial<PersistedState> | undefined)?.settings;
    if (pending != null) schedule(0); // newer state arrived mid-flight
    else clearEnvelope();
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
      let state = (await res.json()) as { schemaVersion?: number } & Partial<PersistedState>;
      loaded = true;
      loadFailed = false;
      baseSettings = state.settings;
      // Fresh server copy in hand: fold in answers queued while offline, then PUT once.
      const queued = pending ?? readEnvelope()?.value ?? null;
      if (queued != null) {
        try {
          const local = (JSON.parse(queued) as { state: PersistedState }).state;
          if (local && local.learningStates && state.learningStates) {
            const env = readEnvelope();
            state = mergeState(state as PersistedState, local, env?.base);
            pending = JSON.stringify({ state, version: state.schemaVersion ?? 0 });
            writeEnvelope(pending);
            failures = 0;
            schedule(0);
          }
        } catch (err) {
          console.error("[remote-storage] could not merge pending copy:", err);
        }
      }
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
    writeEnvelope(value);
    saveFailed = false;
    if (failures === 0) schedule(500); // during an outage keep the backoff timer
    emit();
  },
  removeItem: async (_name) => {
    // No-op: server-side reset is handled by PUT of initial empty state via the store's reset action.
  },
};
