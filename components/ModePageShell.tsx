"use client";

import Link from "next/link";
import { QuizStats } from "./QuizStats";
import { useDueByKey } from "@/lib/use-due-by-key";
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
  /**
   * Subject key into the per-mode due-count map (see lib/due.ts).
   * Pages with a 1:1 SRS mode pass the mode name; sentence/particle pages
   * pass "sentence_vocab"/"sentence_particle" to disambiguate the shared mode.
   * When provided + > 0, a small 復習 N chip appears next to QuizStats.
   */
  dueKey?: string;
  /**
   * Back-link target. Defaults to "/" with the "← HOME" affordance the
   * mode pages all share. Override (with backLabel) for child routes
   * that want to return somewhere other than home — e.g.
   * /chapters/[id] returns to /chapters.
   */
  backHref?: string;
  backLabel?: string;
  titleVariant?: "default" | "subdued";
  headerMarginPx?: number;
  afterHeader?: React.ReactNode;
  children?: React.ReactNode;
}

export function ModePageShell({
  title,
  statKey,
  dueKey,
  backHref = "/",
  backLabel = "← HOME",
  titleVariant = "default",
  headerMarginPx = 32,
  afterHeader,
  children,
}: ModePageShellProps) {
  const dueByKey = useDueByKey();
  const dueCount = dueKey ? dueByKey[dueKey] ?? 0 : 0;
  const titleClass =
    titleVariant === "subdued"
      ? "text-meta tracking-tab text-[color:var(--fg-soft)]"
      : "text-title leading-none font-semibold tracking-tab text-[color:var(--fg)]";

  return (
    // 좌우 안전 영역은 화면 가장자리 기준이라 바깥 main에 둔다. 가운데 정렬된
    // 390px 박스 안쪽에 두면 박스가 이미 가장자리에서 먼 가로 모드에서 내용 폭만
    // 줄어(342→266px) 제목과 버튼이 줄바꿈된다.
    <main className="flex-1 flex justify-center pl-[var(--safe-left)] pr-[var(--safe-right)]">
      <div className="w-full max-w-[390px] px-6 flex flex-col pt-[calc(var(--safe-top)+1rem)] md:pt-[calc(var(--safe-top)+2rem)] pb-[max(1.5rem,var(--safe-bottom))] md:pb-[max(2.5rem,var(--safe-bottom))]">
        <header
          className="flex justify-between items-baseline mb-[var(--header-mb-mobile)] md:mb-[var(--header-mb)]"
          style={
            {
              "--header-mb": `${headerMarginPx}px`,
              "--header-mb-mobile": `${Math.min(headerMarginPx, 16)}px`,
            } as React.CSSProperties
          }
        >
          <Link
            href={backHref}
            className="inline-flex items-center min-h-[44px] -ml-2 px-2 text-caption text-[color:var(--fg-faint)] tracking-wider hover:text-[color:var(--fg)]"
          >
            {backLabel}
          </Link>
          <div className="flex items-baseline gap-2">
            {statKey && <QuizStats statKey={statKey} />}
            {dueCount > 0 && (
              <span
                className="text-[12px] tracking-tab tabular-nums text-[color:var(--accent-progress-text)] font-medium"
                aria-label={`복습 ${dueCount}장 대기`}
              >
                復習 {dueCount}
              </span>
            )}
          </div>
          <h1
            className={titleClass}
            style={{ fontFamily: "var(--font-jp-serif)" }}
          >
            {title}
          </h1>
        </header>
        {afterHeader}
        {children}
        {/* 엄지 닿는 하단 홈 — 상단 ← HOME까지 손을 뻗지 않아도 된다. */}
        {backHref === "/" && (
          <Link
            href="/"
            className="mt-auto pt-10 inline-flex items-center justify-center min-h-[44px] text-caption text-[color:var(--fg-faint)] tracking-wide hover:text-[color:var(--fg)]"
          >
            홈으로
          </Link>
        )}
      </div>
    </main>
  );
}
