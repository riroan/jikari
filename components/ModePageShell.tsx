"use client";

import Link from "next/link";
import { QuizStats } from "./QuizStats";
import type { QuizStatKey } from "@/lib/types";

/**
 * Shared page shell for all mode/utility routes. Replaces ~11 local `Shell`
 * copies that drifted in tiny ways (items-center vs baseline, missing 44px
 * touch targets, varying header margins). Consolidating means the next
 * header change lands in one place.
 *
 * Variants:
 *   titleVariant="default"  → 22px serif, used by 漢字/単語/文法/etc.
 *   titleVariant="subdued"  → 15px soft, used by /expressions.
 *   statKey                  → omit for pages without a quiz stats tally
 *                              (/progress, /settings, /chapters).
 *   headerMarginPx           → override the 32px default for utility pages
 *                              that want breathing room (40/48).
 *   afterHeader              → slot between header and children (e.g. grammar
 *                              TabBar).
 */
export interface ModePageShellProps {
  title: React.ReactNode;
  statKey?: QuizStatKey;
  titleVariant?: "default" | "subdued";
  headerMarginPx?: number;
  afterHeader?: React.ReactNode;
  children?: React.ReactNode;
}

export function ModePageShell({
  title,
  statKey,
  titleVariant = "default",
  headerMarginPx = 32,
  afterHeader,
  children,
}: ModePageShellProps) {
  const titleClass =
    titleVariant === "subdued"
      ? "text-[15px] tracking-tab text-[color:var(--fg-soft)]"
      : "text-[22px] leading-none font-semibold tracking-tab text-[color:var(--fg)]";

  return (
    <main className="flex-1 flex justify-center">
      <div className="w-[390px] px-6 pt-8 pb-10">
        <header
          className="flex justify-between items-baseline"
          style={{ marginBottom: `${headerMarginPx}px` }}
        >
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] -ml-2 px-2 text-[13px] text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            ← HOME
          </Link>
          {statKey && <QuizStats statKey={statKey} />}
          <h1
            className={titleClass}
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            {title}
          </h1>
        </header>
        {afterHeader}
        {children}
      </div>
    </main>
  );
}
