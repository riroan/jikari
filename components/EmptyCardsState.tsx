/**
 * Reusable "no cards yet" placeholder for mode pages whose card pool is
 * empty (typically a fresh checkout / a missing migration / pending seed).
 *
 * Identical layout was duplicated across vocab / kanji / sentence /
 * particle / expressions before this extraction. Conjugation, adjective,
 * and grammar each have a richer empty state (with seed hints + Japanese
 * affordances), so they keep their bespoke versions.
 */
export function EmptyCardsState({
  label,
  hint,
}: {
  /** Korean message: e.g. "단어 카드가 아직 없어요." */
  label: string;
  /** Small dev-tone seed hint shown below the label. */
  hint: string;
}) {
  return (
    <div className="pt-16 text-center text-[color:var(--fg-faint)] text-caption leading-relaxed">
      {label}
      <br />
      <span className="text-[11px] tracking-wider">({hint})</span>
    </div>
  );
}
