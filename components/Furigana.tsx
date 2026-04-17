import React from "react";

/**
 * Furigana ruby rendering.
 *
 * Two ways to use:
 *
 * 1. Inline markup — pass a string with `{kanji|reading}` segments.
 *    The rest renders as plain text. Preserves punctuation, kana, spaces.
 *    Example: "{私|わたし}は{水|みず}を飲む。"
 *
 * 2. Single pair — pass `kanji` + `reading` props for one ruby annotation.
 *
 * DESIGN.md § 6: native <ruby>/<rt>, no external deps.
 */

const RUBY_PATTERN = /\{([^|{}]+)\|([^|{}]+)\}/g;

export function RubyText({
  text,
  className,
  rtClassName,
}: {
  text: string;
  className?: string;
  rtClassName?: string;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  RUBY_PATTERN.lastIndex = 0;
  while ((match = RUBY_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t${key++}`}>{text.slice(lastIndex, match.index)}</span>
      );
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

  return <span className={className}>{parts}</span>;
}

/** Single-pair convenience wrapper (unchanged API from v1). */
export function Furigana({
  kanji,
  reading,
  className = "",
}: {
  kanji: string;
  reading?: string;
  className?: string;
}) {
  if (!reading) {
    return <span className={className}>{kanji}</span>;
  }
  return (
    <ruby className={className} style={{ rubyPosition: "over" }}>
      {kanji}
      <rt style={{ fontSize: "0.45em", letterSpacing: "0.04em" }}>{reading}</rt>
    </ruby>
  );
}
