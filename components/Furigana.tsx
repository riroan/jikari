/**
 * Furigana ruby component — shows reading above kanji.
 *
 * DESIGN.md § 6: use native <ruby>/<rt>, not a 3rd-party lib.
 */

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
      <rt style={{ fontSize: "0.5em", letterSpacing: "0.05em" }}>{reading}</rt>
    </ruby>
  );
}
