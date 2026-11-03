"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production only (dev HMR must never see it).
 * Escape hatch: open any page with ?nosw=1 to unregister + wipe caches and stay off
 * (remembered in localStorage); ?nosw=0 turns it back on.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const flag = new URLSearchParams(location.search).get("nosw");
    try {
      if (flag === "1") localStorage.setItem("jikari-nosw", "1");
      if (flag === "0") localStorage.removeItem("jikari-nosw");
    } catch {}
    let off = false;
    try {
      off = localStorage.getItem("jikari-nosw") === "1";
    } catch {}
    if (off) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()));
      void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.warn("[sw] registration failed:", err);
    });
  }, []);
  return null;
}
