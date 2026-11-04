"use client";

import { RubyText } from "./Furigana";
import { confusableFor, type ConfusableKind, type ConfusableSide } from "@/lib/confusables";

/**
 * "헷갈리면" — hairline two-row contrast for near-equivalent patterns/particles.
 * Renders nothing when the card has no confusable partner. `onJump` (study
 * mode only) turns the partner row into a button.
 */
export function ConfusableNote({
  kind,
  refId,
  defaultOpen = false,
  onJump,
}: {
  kind: ConfusableKind;
  refId: string;
  defaultOpen?: boolean;
  onJump?: (ref: string) => void;
}) {
  const view = confusableFor(kind, refId);
  if (!view) return null;
  const { self, other } = view;
  return (
    <details
      className="group border-t border-[color:var(--line)] pt-1"
      open={defaultOpen}
      data-testid="confusable-note"
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-caption text-[color:var(--fg-faint)] [&::-webkit-details-marker]:hidden">
        <span className="tracking-label">헷갈리면</span>
        <span className="text-[color:var(--fg-soft)]" style={{ fontFamily: "var(--font-jp-sans)" }}>
          {other.label}
        </span>
        <span aria-hidden className="ml-auto transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-3 pb-1">
        <Row side={self} />
        {onJump ? (
          <button
            type="button"
            onClick={() => onJump(other.ref)}
            className="border-t border-[color:var(--line)] pt-3 text-left"
            aria-label={`${other.label} 카드로 이동`}
          >
            <Row side={other} />
          </button>
        ) : (
          <div className="border-t border-[color:var(--line)] pt-3">
            <Row side={other} />
          </div>
        )}
      </div>
    </details>
  );
}

function Row({ side }: { side: ConfusableSide }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="text-small font-medium text-[color:var(--fg)]"
        style={{ fontFamily: "var(--font-jp-sans)" }}
      >
        {side.label}
      </div>
      <div className="text-caption text-[color:var(--fg-soft)] leading-relaxed">{side.diff}</div>
      <div
        className="text-meta leading-[1.7] text-[color:var(--fg)] [overflow-wrap:anywhere]"
        style={{ fontFamily: "var(--font-jp-serif)" }}
      >
        <RubyText text={side.jp} />
      </div>
      <div className="text-label text-[color:var(--fg-faint)]">{side.ko}</div>
    </div>
  );
}
