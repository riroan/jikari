/**
 * CSS font-size that keeps `text` on one line inside the nearest
 * `container-type: inline-size` ancestor: `min(maxPx, 100cqi / chars)`.
 *
 * Big display words (活用 hero, 文法 pattern titles) were fixed sizes, so at a
 * 274px column (322px viewport, Safari page zoom) 間違える or 〜なければならない
 * broke mid-word. ~1.02em per character leaves room for tracking and ruby.
 * `minPx` stops very long strings from shrinking past legibility — those wrap.
 *
 * `text` must be plain (strip ruby markup first): it is only counted.
 */
export function fitFontSize(maxPx: number, text: string, minPx = 0): string {
  const fit = `calc(100cqi / ${([...text].length * 1.02).toFixed(2)})`;
  return minPx > 0 ? `max(${minPx}px, min(${maxPx}px, ${fit}))` : `min(${maxPx}px, ${fit})`;
}
