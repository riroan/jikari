import { StampMark } from "@/components/AnswerFeedback";
import { hookOf, type EquipSlot } from "@/lib/cosmetics";

/** 프로필과 상점에서 같은 꾸미기 미리보기를 보여준다. */
export function CosmeticPreview({ slot, id }: { slot: EquipSlot; id: string }) {
  if (slot === "frame")
    return <span aria-hidden className={`inline-block w-6 h-6 rounded-sm frame-${id ? hookOf(id) : "base"}`} />;
  if (slot === "stamp")
    return (
      <span aria-hidden className="inline-flex w-6 justify-center text-[color:var(--accent-progress-text)]">
        <StampMark id={id} />
      </span>
    );
  return (
    <span data-skin={id ? hookOf(id) : undefined} aria-hidden className="inline-block w-16">
      <span
        data-state="idle"
        className="quiz-choice block px-2 py-1 text-tiny text-[color:var(--fg)] border border-[color:var(--line)] rounded-sm"
        style={{ fontFamily: "var(--font-jp-sans)" }}
      >
        あ
      </span>
    </span>
  );
}
