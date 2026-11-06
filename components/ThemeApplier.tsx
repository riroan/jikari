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
  const palette = useStore((s) => s.progression?.palette ?? "");

  // 보상으로 해금한 색 테마 (globals.css [data-palette]).
  useEffect(() => {
    const root = document.documentElement;
    if (palette) root.dataset.palette = palette;
    else delete root.dataset.palette;
  }, [palette]);

  useEffect(() => {
    const root = document.documentElement;
    // 앱에서 고른 테마가 OS와 다르면 <meta theme-color>(미디어 쿼리 = OS 기준)가
    // 상단 바를 엉뚱한 색으로 칠한다. 강제 테마일 땐 두 태그를 같은 색으로 맞춘다.
    const paintBar = () => {
      const dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((m) => (m.content = dark ? "#0E141E" : "#F5EFE4"));
    };
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
    paintBar();

    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      apply();
      paintBar();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}
