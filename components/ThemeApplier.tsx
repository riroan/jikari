"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * Syncs the active color scheme into <html data-theme="…">.
 * - "system" leaves the attribute unset and lets prefers-color-scheme decide
 *   (see globals.css media-query block).
 * - "light"/"dark" forces the theme.
 *
 * Also writes the resolved value to localStorage["jikari-theme"] as a hint
 * the inline pre-paint script in app/layout.tsx reads on cold load.
 */
export function ThemeApplier() {
  const theme = useStore((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (theme === "light" || theme === "dark") {
        root.dataset.theme = theme;
        try {
          localStorage.setItem("jikari-theme", theme);
        } catch {}
      } else {
        delete root.dataset.theme;
        try {
          localStorage.removeItem("jikari-theme");
        } catch {}
      }
    };

    apply();

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
