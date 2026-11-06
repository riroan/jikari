/**
 * 퀴즈 한 판(run)의 순수 상태 전이. 판은 RUN_LENGTH문제마다, 또는 "틀린 것만
 * 다시" 큐를 다 풀면 끝난다. SRS는 건드리지 않는다 — 채점은 페이지가 review()로 하되,
 * 재시도("틀린 것만 다시") 중에는 review()/recordQuizResult()를 부르지 않는다
 * (오답으로 이미 box가 리셋됐고, 같은 자리 재시도 정답이 승급·히트맵에 잡히면 안 됨).
 */

export const RUN_LENGTH = 10;

export interface RunAnswer {
  id: string;
  correct: boolean;
  /** 요약 화면에 보일 문제/정답 문자열 (페이지가 답할 때 채운다). */
  front: string;
  back: string;
}

export interface RunState {
  answers: RunAnswer[];
  /** "틀린 것만 다시" 중이면 다시 풀 카드 id 큐. */
  retry: string[] | null;
  pos: number;
  done: boolean;
}

export interface RunSummary {
  total: number;
  correct: number;
  /** 0-100 정수 */
  accuracy: number;
  bestStreak: number;
  /** id별 마지막 답이 오답인 것만, 처음 틀린 순서대로 */
  missed: RunAnswer[];
  /** 판 시작 시점 XP (useQuizRun이 채움) — 요약이 지금 XP와 비교한다. */
  xpStart?: number;
}

export const initialRun: RunState = {
  answers: [],
  retry: null,
  pos: 0,
  done: false,
};

export function recordAnswer(
  s: RunState,
  a: RunAnswer,
  length = RUN_LENGTH,
): RunState {
  if (s.done) return s;
  const answers = [...s.answers, a];
  if (s.retry) {
    const pos = s.pos + 1;
    return { ...s, answers, pos, done: pos >= s.retry.length };
  }
  return { ...s, answers, done: answers.length >= length };
}

export function summarize(answers: readonly RunAnswer[]): RunSummary {
  const last = new Map<string, RunAnswer>();
  let correct = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const a of answers) {
    last.delete(a.id); // 재삽입해서 "마지막 답" 기준 순서를 유지
    last.set(a.id, a);
    if (a.correct) {
      correct++;
      bestStreak = Math.max(bestStreak, ++streak);
    } else streak = 0;
  }
  return {
    total: answers.length,
    correct,
    accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
    bestStreak,
    missed: [...last.values()].filter((a) => !a.correct),
  };
}

export function retryMissed(s: RunState): RunState {
  const ids = summarize(s.answers).missed.map((a) => a.id);
  return ids.length ? { answers: [], retry: ids, pos: 0, done: false } : s;
}

/** 요약 화면에서 "계속" — 새 판 시작. */
export function nextRun(): RunState {
  return initialRun;
}

/** 재시도 중이면 지금 풀 카드 id, 아니면 null (페이지가 평소 덱을 쓴다). */
export function retryId(s: RunState): string | null {
  return s.retry && !s.done ? (s.retry[s.pos] ?? null) : null;
}

/** 활용 결과처럼 던질 수 있는 정답 문자열 계산 — 요약 라벨용이라 실패하면 빈 문자열. */
export function answerOf(fn: () => string): string {
  try {
    return fn();
  } catch {
    return "";
  }
}
