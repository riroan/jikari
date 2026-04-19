"use client";

import { RubyText } from "./Furigana";

/**
 * Grammar pattern highlight renderer.
 *
 * Reuses the unified parser (lib/jp-markup.ts) via RubyText — the parser
 * already handles `[[...]]` segments by emitting <mark class="jp-highlight">
 * with tokens defined in globals.css. Highlight visibility is independent of
 * the furigana toggle (pedagogical cue always visible).
 *
 * This file exists as a semantic alias: grammar-mode code imports
 * `PatternHighlight` to make intent clear. Ruby-only sites keep using
 * `RubyText` directly.
 */
export function PatternHighlight({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return <RubyText text={text} className={className} />;
}
