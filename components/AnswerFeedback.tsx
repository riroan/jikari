"use client";

import { motion } from "framer-motion";

/**
 * Correct: Framer Motion scale pulse + green check.
 * Wrong:   CSS shake (outside voice catch — avoids Framer+Motion layering
 *          frame drops on older iPhones) + red X.
 * DESIGN.md § 7.
 */
export function AnswerFeedback({ correct }: { correct: boolean }) {
  if (correct) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        className="inline-flex items-center gap-2 text-[color:var(--accent-progress)] font-medium"
        aria-live="polite"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 13l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>正解</span>
      </motion.div>
    );
  }
  return (
    <div
      className="inline-flex items-center gap-2 font-medium"
      style={{
        animation: "shake 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        color: "var(--accent-korean)",
      }}
      aria-live="polite"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 6l12 12M6 18L18 6"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span>不正解</span>
    </div>
  );
}
