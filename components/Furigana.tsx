"use client";

import React, { createContext, useContext, useMemo } from "react";
import { parseMarkup, stripMarkup, type Segment } from "@/lib/jp-markup";

/**
 * Furigana ruby rendering with a global on/off switch.
 *
 * Markup handled by `lib/jp-markup.ts`:
 *   `{漢字|かんじ}`     ruby
 *   `[[pattern]]`       highlight (delegated to <PatternHighlight>)
 *
 * Global toggle via <FuriganaProvider value={boolean}>. When disabled,
 * ruby markup is stripped and only the base is shown. Highlight markup
 * is still rendered (it's a pedagogical cue, independent of furigana pref).
 *
 * DESIGN.md § 6: native <ruby>/<rt>, no external deps.
 */

const FuriganaContext = createContext<boolean>(true);

export function FuriganaProvider({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <FuriganaContext.Provider value={show}>
      {children}
    </FuriganaContext.Provider>
  );
}

/** Strip ruby markup, keeping only kanji portion. Preserved for back-compat. */
export function stripRuby(text: string): string {
  return stripMarkup(parseMarkup(text));
}

export function RubyText({
  text,
  className,
  rtClassName,
  /** Force show regardless of context (rare — e.g., answer reveal card back) */
  forceShow,
}: {
  text: string;
  className?: string;
  rtClassName?: string;
  forceShow?: boolean;
}) {
  const contextShow = useContext(FuriganaContext);
  const show = forceShow ?? contextShow;

  const segments = useMemo(() => parseMarkup(text), [text]);

  return (
    <span className={className}>
      {renderSegments(segments, show, rtClassName)}
    </span>
  );
}

/**
 * Internal renderer. Walks the Segment tree and emits React nodes.
 * Exported for PatternHighlight and any future consumer.
 */
export function renderSegments(
  segments: Segment[],
  showRuby: boolean,
  rtClassName?: string,
): React.ReactNode {
  return segments.map((seg, idx) => {
    if (seg.kind === "text") {
      return <span key={idx}>{seg.text}</span>;
    }
    if (seg.kind === "ruby") {
      if (!showRuby) return <span key={idx}>{seg.base}</span>;
      return (
        <ruby key={idx} style={{ rubyPosition: "over" }}>
          {seg.base}
          <rt
            className={rtClassName}
            style={{
              fontSize: "0.45em",
              letterSpacing: "0.04em",
              fontWeight: 400,
            }}
          >
            {seg.furigana}
          </rt>
        </ruby>
      );
    }
    // highlight — <mark> with token color (see components/PatternHighlight)
    return (
      <mark
        key={idx}
        className="jp-highlight"
      >
        {renderSegments(seg.children, showRuby, rtClassName)}
      </mark>
    );
  });
}

/** Single-pair convenience wrapper. Respects context toggle. */
export function Furigana({
  kanji,
  reading,
  className = "",
}: {
  kanji: string;
  reading?: string;
  className?: string;
}) {
  const show = useContext(FuriganaContext);
  if (!reading || !show) {
    return <span className={className}>{kanji}</span>;
  }
  return (
    <ruby className={className} style={{ rubyPosition: "over" }}>
      {kanji}
      <rt style={{ fontSize: "0.45em", letterSpacing: "0.04em" }}>{reading}</rt>
    </ruby>
  );
}
