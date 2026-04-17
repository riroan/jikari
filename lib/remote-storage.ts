"use client";

import type { StateStorage } from "zustand/middleware";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: string | null = null;
let inFlight: Promise<void> | null = null;

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
      return JSON.stringify({ state, version: state.schemaVersion ?? 0 });
    } catch (err) {
      console.error("[remote-storage] GET failed:", err);
      return null;
    }
  },
  setItem: (_name, value) => {
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
