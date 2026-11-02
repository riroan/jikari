"use client";

import { useState } from "react";
import {
  initialRun,
  RUN_LENGTH,
  nextRun,
  recordAnswer,
  retryId,
  retryMissed,
  summarize,
  type RunSummary,
} from "./quiz-run";

/**
 * 페이지에서: `run.record(id, correct, front, back)` 후 `if (!run.retrying) advance()`.
 * 덱이 RUN_LENGTH보다 짧으면 덱 길이만큼만 한 판. 카드 선택은 `run.retryId ?? deck[...]`, 요약은 `run.summary`가 있으면 렌더.
 */
export function useQuizRun(deckLength = RUN_LENGTH) {
  const length = Math.min(RUN_LENGTH, deckLength);
  const [s, setS] = useState(initialRun);
  const summary: RunSummary | null = s.done ? summarize(s.answers) : null;
  return {
    summary,
    retryId: retryId(s),
    retrying: s.retry !== null && !s.done,
    record: (id: string, correct: boolean, front: string, back: string) =>
      setS((p) => recordAnswer(p, { id, correct, front, back }, length)),
    retryMissed: () => setS(retryMissed),
    next: () => setS(nextRun()),
  };
}
