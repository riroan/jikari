"use client";

import { useStore } from "@/lib/store";
import { cosmeticById } from "@/lib/cosmetics";

/**
 * Correct: CSS scale pulse (anim-pop-in, ease-out — no spring overshoot) + green check.
 * Wrong:   CSS shake (outside voice catch — avoids Framer+Motion layering
 *          frame drops on older iPhones) + red X.
 * DESIGN.md § 7.
 */
export function AnswerFeedback({ correct }: { correct: boolean }) {
  const stamp = useStore((s) => s.progression?.equip?.stamp ?? "");
  if (correct) {
    return (
      <div className="anim-pop-in inline-flex items-center gap-2 text-[color:var(--accent-progress-text)] font-medium">
        <StampMark id={stamp} />
        <span lang="ja">正解</span>
      </div>
    );
  }
  return (
    <div
      className="inline-flex items-center gap-2 font-medium"
      style={{
        animation: "shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        color: "var(--accent-korean)",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 6l12 12M6 18L18 6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span lang="ja">不正解</span>
    </div>
  );
}

/**
 * 정답 표시 — 기본은 체크, 프로필에서 장착한 정답 도장(lib/cosmetics stamp:*)이면 인장.
 * 글자 「正解」가 따로 붙으므로 장식(aria-hidden)이다.
 */
export function StampMark({ id }: { id: string }) {
  const c = id ? cosmeticById.get(id) : undefined;
  if (!c) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const hana = id === "stamp:hanamaru";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full -rotate-6 leading-none text-[12px] font-semibold border-current ${
        hana ? "border-[3px] border-double" : "border-[1.5px]"
      }`}
      style={{ fontFamily: "var(--font-jp-serif)" }}
    >
      {hana ? "花" : c.jp}
    </span>
  );
}
