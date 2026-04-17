"use client";

import React, { createContext, useContext, useMemo } from "react";

/**
 * Furigana ruby rendering with a global on/off switch.
 *
 * Markup: `{漢字|かんじ}` — braced segments render as <ruby><rt>, rest plain.
 *
 * Global toggle via <FuriganaProvider value={boolean}>. When disabled,
 * markup is stripped and only the kanji (first group) is shown as plain text.
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

const RUBY_PATTERN = /\{([^|{}]+)\|([^|{}]+)\}/g;

/** Strip ruby markup, keeping only kanji portion. */
export function stripRuby(text: string): string {
  return text.replace(RUBY_PATTERN, "$1");
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

  const nodes = useMemo(() => {
    if (!show) {
      return <>{stripRuby(text)}</>;
    }
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    RUBY_PATTERN.lastIndex = 0;
    while ((match = RUBY_PATTERN.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t${key++}`}>{text.slice(lastIndex, match.index)}</span>);
      }
      const [, kanji, reading] = match;
      parts.push(
        <ruby key={`r${key++}`} style={{ rubyPosition: "over" }}>
          {kanji}
          <rt
            className={rtClassName}
            style={{
              fontSize: "0.45em",
              letterSpacing: "0.04em",
              fontWeight: 400,
            }}
          >
            {reading}
          </rt>
        </ruby>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push(<span key={`t${key++}`}>{text.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
  }, [text, show]);

  return <span className={className}>{nodes}</span>;
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
