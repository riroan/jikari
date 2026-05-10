"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { PersistedState } from "@/lib/types";

type Theme = PersistedState["settings"]["theme"];

const ORDER: readonly Theme[] = ["light", "dark", "system"] as const;
const LABEL: Record<Theme, string> = {
  light: "라이트",
  dark: "다크",
  system: "시스템",
};

/**
 * Footer-nav-sized theme toggle. One click cycles light → dark → system.
 * The caption-tone label keeps it visually equal to the rest of the nav
 * (HOME · PROGRESS · SETTINGS) instead of standing out.
 *
 * Renders the default ("시스템") label until hydration finishes so the SSR
 * markup matches the first client paint and avoids a width jump.
 */
export function ThemeCycleButton({ className }: { className?: string }) {
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const display: Theme = mounted ? theme : "system";

  const cycle = () => {
    const i = ORDER.indexOf(theme);
    const next = ORDER[(i + 1) % ORDER.length];
    updateSettings({ theme: next });
  };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`테마: ${LABEL[display]} (클릭하면 다음 테마로 전환)`}
      className={
        className ??
        "inline-flex items-center justify-center min-h-[44px] px-2 hover:text-[color:var(--fg-soft)] transition-colors"
      }
    >
      {LABEL[display]}
    </button>
  );
}
