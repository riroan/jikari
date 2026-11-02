"use client";

import type { StateStorage } from "zustand/middleware";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: string | null = null;
let inFlight: Promise<void> | null = null;
/**
 * PUT replaces the whole server state (DELETE + INSERT). If the initial GET
 * failed, the store is running on its empty defaults, and saving that would
 * wipe every learning record. So nothing is written until a GET succeeds.
 */
let loaded = false;

/** Test-only: reset module state between cases. */
export function __resetRemoteStorageForTests() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  pending = null;
  inFlight = null;
  loaded = false;
}

async function flushPut() {
  if (pending == null) return;
  const value = pending;
  pending = null;
  try {
    const parsed = JSON.parse(value) as { state: unknown; version?: number };
    await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.state),
    });
  } catch (err) {
    console.error("[remote-storage] PUT failed:", err);
  } finally {
    inFlight = null;
  }
}

export const remoteStorage: StateStorage = {
  getItem: async (_name) => {
    try {
      const res = await fetch("/api/progress", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const state = (await res.json()) as { schemaVersion?: number };
      loaded = true;
      return JSON.stringify({ state, version: state.schemaVersion ?? 0 });
    } catch (err) {
      console.error("[remote-storage] GET failed:", err);
      return null;
    }
  },
  setItem: (_name, value) => {
    if (!loaded) {
      console.warn("[remote-storage] progress never loaded — not saving over the server copy");
      return;
    }
    pending = value;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (inFlight) {
        // queue another tick after current PUT finishes
        inFlight.finally(() => {
          if (pending) flushPut();
        });
      } else {
        inFlight = flushPut();
      }
    }, 500);
  },
  removeItem: async (_name) => {
    // No-op: server-side reset is handled by PUT of initial empty state via the store's reset action.
  },
};
