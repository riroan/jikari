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
import { useLocalPref } from "./use-local-pref";

/** 설정의 "한 판 문제 수". endless면 판이 끝나지 않는다 (덱은 페이지가 순환). */
export const RUN_LENGTH_KEY = "jikari-run-length";
export type RunLengthPref = "10" | "endless";
export const isRunLengthPref = (raw: string): raw is RunLengthPref =>
  raw === "10" || raw === "endless";

/**
 * 페이지에서: `run.record(id, correct, front, back)` 후 `if (!run.retrying) advance()`.
 * 덱이 RUN_LENGTH보다 짧으면 덱 길이만큼만 한 판. 카드 선택은 `run.retryId ?? deck[...]`, 요약은 `run.summary`가 있으면 렌더.
 * allowEndless=false: 고정 덱(믹스)처럼 순환하지 않는 판은 무한 설정을 무시한다.
 */
export function useQuizRun(deckLength = RUN_LENGTH, maxLength = RUN_LENGTH, allowEndless = true) {
  const [pref] = useLocalPref(RUN_LENGTH_KEY, "10", isRunLengthPref);
  const length =
    allowEndless && pref === "endless" ? Infinity : Math.min(maxLength, deckLength);
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
