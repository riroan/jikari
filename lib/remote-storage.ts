"use client";

import type { StateStorage } from "zustand/middleware";
import { backoffMs } from "./retry";
import { mergeState } from "./merge-state";
import type { Progression } from "./progression";
import type { PersistedState } from "./types";

/**
 * Durable copy of the not-yet-saved write, so closing the app offline loses nothing.
 * Versioned key; envelope = { v, base (server settings it was based on), value (zustand JSON) }.
 */
const PENDING_KEY = "jikari-pending-v1";
const REJECTED_KEY = "jikari-pending-rejected-v1";
type Ratings = PersistedState["ratings"];
type Envelope = { v: 1; base?: PersistedState["settings"]; baseRatings?: Ratings; baseProgression?: Progression; replace?: true; value: string };
let storedPending: boolean | null = null; // cached "a pending copy exists in localStorage"
let baseSettings: PersistedState["settings"] | undefined;
let baseRatings: Ratings | undefined;
let baseProgression: Progression | undefined;
let staleBaseProgression: Progression | undefined;
/**
 * Version tag (ETag) of the server state this session last saw (GET or successful PUT). Sent as If-Match;
 * the server answers 409 + its current state if someone else saved since. null = unknown/old server -> unconditional.
 */
let serverTag: string | null = null;
/**
 * The pending copy is an explicit user replace (backup restore / reset, already confirmed): it must reach the
 * server as-is, never merged back with older/newer data. `replaceArmed` = the next store write is that replace.
 */
let replace = false;
let replaceArmed = false;
let replaceSeq = 0; // bumps on every explicit replace, so an in-flight one finishing can't clear a newer one
let replaceRetries = 0;
/** Call right before replaceAll()/reset() from a confirmed destructive action. */
export function markReplaceNext() {
  replaceArmed = true;
}
/**
 * A 409 merge produced `lastMerged`, but the zustand store still holds the pre-merge state until the
 * rehydrate GET lands. Writes in that window are merged into `lastMerged` so a stale store never overwrites it.
 * `mergeEpoch` lets a GET that started before the conflict (stale) not clear the flag.
 */
let staleStore = false;
let lastMerged: PersistedState | null = null;
let mergeEpoch = 0;
/** Consecutive 409 merge-retries in the current flush chain; past the cap we fall back to backoff. */
let conflicts = 0;
const MAX_CONFLICTS = 5;
/**
 * The GET was answered by the service worker from its last-good copy (offline). It is good enough to
 * study from, but NEVER to save over the server: answers only queue in localStorage until a fresh GET succeeds.
 */
let snapshot = false;
let resyncTimer: ReturnType<typeof setInterval> | null = null;
export const RESYNC_EVENT = "jikari:resync";
/** A 409 merge produced a state the in-memory store lacks: HydrationBoundary re-hydrates from it. */
export const MERGED_EVENT = "jikari:merged";
/** Offline-snapshot mode: ask the store to re-run the GET (HydrationBoundary listens). */
function requestResync() {
  if (
    snapshot &&
    typeof navigator !== "undefined" &&
    navigator.onLine !== false
  ) {
    window.dispatchEvent(new Event(RESYNC_EVENT));
  }
}
function setSnapshot(on: boolean) {
  snapshot = on;
  if (on && !resyncTimer) resyncTimer = setInterval(requestResync, 15_000);
  if (!on && resyncTimer) {
    clearInterval(resyncTimer);
    resyncTimer = null;
  }
}
/** True while the store runs on the SW's offline snapshot (read-mostly; saves are queued). */
export function isOfflineSnapshot() {
  return snapshot;
}

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
/**
 * In-memory mirror of the newest envelope we tried to write. If localStorage throws (quota/private mode)
 * the stored copy is stale; loadAndMerge must prefer this one so a stale envelope never replaces the store.
 */
let memEnv: Envelope | null = null;
/** The last envelope write failed: the queue exists only in memory (lost if the tab closes). */
let persistFailed = false;
function writeEnvelope(value: string) {
  const env: Envelope = {
    v: 1, base: baseSettings, baseRatings, baseProgression, ...(replace ? { replace: true } : {}), value,
  };
  memEnv = env;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(env));
    storedPending = true;
    persistFailed = false;
  } catch (err) {
    persistFailed = true;
    console.warn("[remote-storage] could not persist pending write:", err);
  }
}
function clearEnvelope() {
  memEnv = null;
  persistFailed = false;
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
  storedPending = false;
}
function hasStoredPending(): boolean {
  if (memEnv) return true;
  if (storedPending == null) {
    try {
      storedPending =
        typeof localStorage !== "undefined" &&
        localStorage.getItem(PENDING_KEY) != null;
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
export type SyncStatus =
  "idle" | "pending" | "offline" | "offline-queued" | "snapshot" | "failed" | "no-space";
export function getSyncStatus(): SyncStatus {
  const queued = pending != null || inFlight || hasStoredPending();
  if (queued && persistFailed) return "no-space"; // answers are held in memory only
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return queued ? "offline-queued" : "offline";
  if (queued) return "pending";
  if (snapshot) return "snapshot"; // opened from the SW's offline copy, fresh GET not yet done
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
  memEnv = null;
  persistFailed = false;
  baseSettings = undefined;
  baseRatings = undefined;
  baseProgression = undefined;
  staleBaseProgression = undefined;
  serverTag = null;
  conflicts = 0;
  replace = false;
  replaceArmed = false;
  replaceSeq = 0;
  replaceRetries = 0;
  getInFlight = null;
  staleStore = false;
  lastMerged = null;
  mergeEpoch = 0;
  setSnapshot(false);
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), ms);
}

async function flush() {
  timer = null;
  if (inFlight || pending == null) return;
  const value = pending;
  const wasReplace = replace;
  const seq = replaceSeq;
  pending = null;
  inFlight = true;
  emit();
  try {
    const parsed = JSON.parse(value) as { state: unknown };
    const res = await fetch("/api/progress", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(serverTag ? { "If-Match": serverTag } : {}),
        ...(wasReplace ? { "X-Jikari-Replace": "1" } : {}),
      },
      body: JSON.stringify(parsed.state),
    });
    if (res.status === 409) {
      if (wasReplace) await onReplaceConflict(value);
      else await onConflict(res, value);
      return;
    }
    if (!res.ok) {
      const retryable =
        res.status < 400 ||
        res.status >= 500 ||
        [401, 403, 408, 429].includes(res.status);
      if (retryable) throw new Error(`HTTP ${res.status}`);
      // Permanent rejection: retrying the same payload can never succeed. Drop it.
      console.error(
        `[remote-storage] PUT rejected (HTTP ${res.status}), dropping payload`,
      );
      saveFailed = true;
      failures = 0;
      if (wasReplace && seq === replaceSeq) replace = false; // a rejected restore must not stamp later answers as replace
      // keep the rejected payload for manual recovery instead of re-merging it on every load
      // (only the latest one, and PENDING is removed first so the two never coexist at full size)
      try {
        const env = localStorage.getItem(PENDING_KEY) ?? (memEnv ? JSON.stringify(memEnv) : null);
        if (env != null && pending == null) {
          localStorage.removeItem(PENDING_KEY);
          localStorage.setItem(REJECTED_KEY, env);
        }
      } catch {}
      if (pending == null) clearEnvelope();
      else {
        if (wasReplace) writeEnvelope(pending);
        schedule(0);
      }
      return;
    }
    failures = 0;
    conflicts = 0;
    replaceRetries = 0;
    saveFailed = false;
    serverTag = res.headers.get("ETag");
    const saved = parsed.state as Partial<PersistedState> | undefined;
    baseSettings = saved?.settings;
    baseRatings = saved?.ratings;
    baseProgression = saved?.progression;
    if (pending === value) pending = null; // a re-merge produced the very payload we just saved
    if (wasReplace && seq === replaceSeq) replace = false; // the server now holds the replaced state; later writes merge normally
    if (pending != null) {
      writeEnvelope(pending); // newer edits are relative to the state just saved
      schedule(0); // newer state arrived mid-flight
    } else clearEnvelope();
  } catch (err) {
    console.error("[remote-storage] PUT failed, will retry:", err);
    if (pending == null) pending = value; // keep the data; a newer value wins
    schedule(backoffMs(++failures));
  } finally {
    inFlight = false;
    emit();
  }
}

/**
 * 409: another device saved since our last GET. Fold the server's current state into what we are
 * saving (same merge as after offline), adopt its tag, ask the store to adopt the merge, and retry.
 */
async function onConflict(res: Response, value: string) {
  const server = (await res.json()) as PersistedState;
  const tag = res.headers.get("ETag");
  // A newer pending value is a full snapshot that already includes `value`.
  const latest = pending != null && pending !== value ? pending : value;
  const local = (JSON.parse(latest) as { state: PersistedState }).state;
  const merged = mergeState(server, local, baseSettings, baseRatings, baseProgression);
  staleBaseProgression = local.progression;
  serverTag = tag;
  baseSettings = server.settings;
  baseRatings = server.ratings;
  baseProgression = server.progression;
  pending = JSON.stringify({ state: merged, version: merged.schemaVersion ?? 0 });
  writeEnvelope(pending);
  staleStore = true;
  lastMerged = merged;
  mergeEpoch++;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(MERGED_EVENT));
  if (++conflicts > MAX_CONFLICTS) schedule(backoffMs(++failures));
  else schedule(0);
}

/**
 * 409 on an explicit replace: do NOT merge (that would undo the restore). Only refresh the tag and
 * retry once immediately; after that fall back to backoff (the tag is fresh by then).
 */
async function onReplaceConflict(value: string) {
  const res = await fetch("/api/progress", { cache: "no-store" });
  const tag = res.headers.get("ETag");
  if (!res.ok || !tag || res.headers.get("X-Jikari-Offline-Snapshot") === "1")
    throw new Error("could not refresh version tag");
  serverTag = tag;
  if (pending == null) pending = value;
  if (replaceRetries++ < 1) schedule(0);
  else {
    replaceRetries = 0;
    schedule(backoffMs(++failures));
  }
}

/** Retry now (network came back / app foregrounded). */
function kick() {
  requestResync();
  if (pending != null && !inFlight) schedule(0);
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", kick);
  window.addEventListener("offline", emit);
  document.addEventListener("visibilitychange", kick);
}

/** Concurrent triggers (initial hydrate, resync, retry button) share ONE GET→merge→PUT cycle. */
let getInFlight: Promise<string | null> | null = null;
function getOnce(): Promise<string | null> {
  return (getInFlight ??= loadAndMerge().finally(() => {
    getInFlight = null;
  }));
}

async function loadAndMerge(): Promise<string | null> {
  const epoch = mergeEpoch;
  try {
    const res = await fetch("/api/progress", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let state = (await res.json()) as {
      schemaVersion?: number;
    } & Partial<PersistedState>;
    const freshProgression = state.progression;
    const fromSnapshot = res.headers.get("X-Jikari-Offline-Snapshot") === "1";
    setSnapshot(fromSnapshot);
    if (!fromSnapshot) loaded = true;
    loadFailed = false;
    serverTag = fromSnapshot ? null : res.headers.get("ETag");
    const env0 = memEnv ?? readEnvelope();
    const queued = pending ?? env0?.value ?? null;
    baseSettings = env0?.base ?? state.settings;
    baseRatings = env0?.baseRatings ?? state.ratings;
    // Old pending envelopes have no progression base; keep the safe max fallback.
    baseProgression = queued ? env0?.baseProgression : state.progression;
    // Fresh server copy in hand: fold in answers queued while offline, then PUT once.
    if (queued != null) {
      try {
        const local = (JSON.parse(queued) as { state: PersistedState }).state;
        if (local && local.learningStates && state.learningStates) {
          const env = env0;
          if (replace || env?.replace) {
            replace = true;
            state = local; // explicit restore/reset: send as-is with the fresh tag, no merge
          } else state = mergeState(state as PersistedState, local, env?.base, env?.baseRatings, env?.baseProgression);
          // The queued merged state now contains the fresh server copy. Future
          // retries must count only the local delta beyond that copy.
          if (!fromSnapshot) baseProgression = freshProgression;
          pending = JSON.stringify({
            state,
            version: state.schemaVersion ?? 0,
          });
          writeEnvelope(pending);
          if (fromSnapshot) {
            pending = null; // offline snapshot: queue only, the fresh GET will merge again
          } else {
            failures = 0;
            schedule(0);
          }
        }
      } catch (err) {
        console.error("[remote-storage] could not merge pending copy:", err);
      }
    }
    if (epoch === mergeEpoch) staleStore = false; // the store is about to adopt a GET newer than the merge
    emit();
    return JSON.stringify({ state, version: state.schemaVersion ?? 0 });
  } catch (err) {
    console.error("[remote-storage] GET failed:", err);
    loadFailed = true;
    emit();
    return null;
  }
}

export const remoteStorage: StateStorage = {
  getItem: (_name) => getOnce(),
  setItem: (_name, value) => {
    if (replaceArmed) {
      replaceArmed = false;
      if (snapshot || loaded) {
        replace = true;
        replaceSeq++;
      }
    }
    if (snapshot) {
      writeEnvelope(value); // durable queue; flushed after the next fresh GET + merge
      emit();
      return;
    }
    if (!loaded) {
      console.warn(
        "[remote-storage] progress never loaded — not saving over the server copy",
      );
      return;
    }
    if (staleStore && lastMerged && !replace) {
      // the store has not adopted the 409 merge yet: never save its stale state bare
      const local = (JSON.parse(value) as { state: PersistedState }).state;
      const m = mergeState(lastMerged, local, baseSettings, baseRatings, staleBaseProgression);
      staleBaseProgression = local.progression;
      lastMerged = m;
      value = JSON.stringify({ state: m, version: m.schemaVersion ?? 0 });
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
