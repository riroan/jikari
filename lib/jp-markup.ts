/**
 * Unified Japanese markup parser.
 *
 * Two inline markup kinds:
 *   `{漢字|かんじ}`     furigana ruby
 *   `[[〜なければ]]`    pattern highlight (<mark>)
 *
 * Nesting rule: highlight may CONTAIN ruby. Reverse is not expressible at the
 * grammar level (ruby base/reading use `[^|{}]+`), but any residual `[[` /
 * `]]` / `{` / `}` left in text after parsing is a sign of malformed input —
 * we strip them and console.warn.
 *
 * Malformed markup (e.g., unclosed `{...`, `[[...`) → literal text with the
 * bracket characters stripped, no crash.
 *
 * Single left-to-right pass, O(n). Consumers:
 *   - components/Furigana.tsx (RubyText) renders ruby segments
 *   - components/PatternHighlight.tsx renders highlight segments
 *   - The two are layered: PatternHighlight wraps children in <mark>, which
 *     then defers to RubyText for any ruby children.
 */

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "ruby"; base: string; furigana: string }
  | { kind: "highlight"; children: Segment[] };

/**
 * Parse an inline markup string into a flat segment tree.
 *
 * Depth is limited to 1 level of highlight (ruby inside highlight allowed;
 * nested highlights collapse to the outer). Extra `]]` or unmatched `{` are
 * emitted as literal text minus their brackets, with a warning.
 */
export function parseMarkup(str: string): Segment[] {
  if (!str) return [];
  const { segments, warnings } = parseRange(str, 0, str.length, /*inHighlight*/ false);
  if (warnings.length > 0 && typeof console !== "undefined") {
    console.warn(`[jp-markup] malformed input: ${warnings.join(", ")} — input="${str}"`);
  }
  return mergeAdjacentText(segments);
}

/**
 * Flatten segments back to plain text (ruby → base only, highlight → children
 * unwrapped). Used when furigana is toggled off, or as a safety fallback.
 */
export function stripMarkup(segments: Segment[]): string {
  let out = "";
  for (const seg of segments) {
    if (seg.kind === "text") out += seg.text;
    else if (seg.kind === "ruby") out += seg.base;
    else out += stripMarkup(seg.children);
  }
  return out;
}

interface ParseResult {
  segments: Segment[];
  warnings: string[];
}

function parseRange(
  str: string,
  start: number,
  end: number,
  inHighlight: boolean,
): ParseResult {
  const segments: Segment[] = [];
  const warnings: string[] = [];
  let i = start;
  let buf = "";
  // When inHighlight, track stripped `[[` nesting so we can strip their matching `]]`
  let nestedHlDepth = 0;

  const flushText = () => {
    if (buf.length > 0) {
      segments.push({ kind: "text", text: buf });
      buf = "";
    }
  };

  while (i < end) {
    const c = str[i];
    const next = str[i + 1];

    // Ruby: {base|furigana}
    if (c === "{") {
      const closeIdx = findMatchingBrace(str, i + 1, end);
      const pipeIdx = closeIdx !== -1 ? str.indexOf("|", i + 1) : -1;
      if (closeIdx !== -1 && pipeIdx !== -1 && pipeIdx < closeIdx) {
        const base = str.slice(i + 1, pipeIdx);
        const furigana = str.slice(pipeIdx + 1, closeIdx);
        if (base.length > 0 && furigana.length > 0 && !hasSpecialChars(base) && !hasSpecialChars(furigana)) {
          flushText();
          segments.push({ kind: "ruby", base, furigana });
          i = closeIdx + 1;
          continue;
        }
        // braces found but content is invalid — strip the whole `{...}`
        warnings.push("invalid ruby content");
        // Keep the inner text minus `|` to avoid leaking the pipe
        const stripped = str.slice(i + 1, closeIdx).replace(/\|/g, "");
        buf += stripped;
        i = closeIdx + 1;
        continue;
      }
      // no matching `}` — strip the stray `{`
      warnings.push("unclosed {");
      i += 1;
      continue;
    }

    // Stray `}` outside ruby — strip
    if (c === "}") {
      warnings.push("stray }");
      i += 1;
      continue;
    }

    // Highlight: [[ ... ]]
    if (c === "[" && next === "[") {
      if (inHighlight) {
        // Nested [[ — strip and remember we owe a matching `]]` strip
        warnings.push("nested highlight");
        nestedHlDepth += 1;
        i += 2;
        continue;
      }
      const closeIdx = findMatchingHighlightClose(str, i + 2, end);
      if (closeIdx !== -1) {
        flushText();
        const inner = parseRange(str, i + 2, closeIdx, /*inHighlight*/ true);
        warnings.push(...inner.warnings);
        segments.push({ kind: "highlight", children: mergeAdjacentText(inner.segments) });
        i = closeIdx + 2;
        continue;
      }
      // unclosed [[ — strip brackets, continue
      warnings.push("unclosed [[");
      i += 2;
      continue;
    }

    // `]]` inside a highlight: strip (pairs with earlier stripped `[[`).
    // `]]` outside a highlight: stray, strip + warn.
    if (c === "]" && next === "]") {
      if (inHighlight && nestedHlDepth > 0) {
        nestedHlDepth -= 1;
      } else {
        warnings.push("stray ]]");
      }
      i += 2;
      continue;
    }

    buf += c;
    i += 1;
  }

  flushText();
  return { segments, warnings };
}

function findMatchingBrace(str: string, start: number, end: number): number {
  // ruby has no nesting in our grammar — first `}` wins
  for (let i = start; i < end; i++) {
    if (str[i] === "}") return i;
    if (str[i] === "{") return -1; // stray inner { breaks it
  }
  return -1;
}

function findMatchingHighlightClose(str: string, start: number, end: number): number {
  // match the `]]` that closes the outer highlight.
  // `{...}` (ruby) nests independently; `[[...]]` nested attempts bump depth so
  // the outer close isn't stolen by an inner `]]`.
  let rubyDepth = 0;
  let hlDepth = 0;
  for (let i = start; i < end; i++) {
    const c = str[i];
    const next = str[i + 1];
    if (c === "{") rubyDepth += 1;
    else if (c === "}") rubyDepth = Math.max(0, rubyDepth - 1);
    else if (rubyDepth === 0 && c === "[" && next === "[") {
      hlDepth += 1;
      i += 1;
    } else if (rubyDepth === 0 && c === "]" && next === "]") {
      if (hlDepth === 0) return i;
      hlDepth -= 1;
      i += 1;
    }
  }
  return -1;
}

function hasSpecialChars(s: string): boolean {
  return s.includes("{") || s.includes("}") || s.includes("|");
}

function mergeAdjacentText(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segments) {
    const last = out[out.length - 1];
    if (seg.kind === "text" && last && last.kind === "text") {
      last.text += seg.text;
    } else {
      out.push(seg);
    }
  }
  return out;
}
