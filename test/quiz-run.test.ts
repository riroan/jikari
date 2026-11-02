import { describe, expect, test } from "vitest";
import {
  initialRun,
  recordAnswer,
  retryId,
  retryMissed,
  summarize,
  type RunAnswer,
  type RunState,
} from "@/lib/quiz-run";

const a = (id: string, correct: boolean): RunAnswer => ({
  id,
  correct,
  front: id,
  back: `${id}!`,
});
const run = (s: RunState, ...xs: [string, boolean][]) =>
  xs.reduce((acc, [id, ok]) => recordAnswer(acc, a(id, ok), 4), s);

describe("quiz-run", () => {
  test("ends after the run length", () => {
    const s = run(initialRun, ["a", true], ["b", true], ["c", true]);
    expect(s.done).toBe(false);
    expect(run(s, ["d", false]).done).toBe(true);
  });

  test("summarize: accuracy, best streak, missed by last answer", () => {
    const sum = summarize([
      a("a", true),
      a("b", false),
      a("c", true),
      a("d", true),
      a("b", true),
    ]);
    expect(sum).toMatchObject({ total: 5, correct: 4, accuracy: 80, bestStreak: 3 });
    expect(sum.missed).toEqual([]);
    expect(summarize([a("x", false), a("y", false)]).missed.map((m) => m.id)).toEqual(["x", "y"]);
    expect(summarize([]).accuracy).toBe(0);
  });

  test("retry replays only missed cards and ends with the queue", () => {
    const done = run(initialRun, ["a", true], ["b", false], ["c", false], ["d", true]);
    const r = retryMissed(done);
    expect(r.retry).toEqual(["b", "c"]);
    expect(retryId(r)).toBe("b");
    const r2 = recordAnswer(r, a("b", true));
    expect(retryId(r2)).toBe("c");
    const r3 = recordAnswer(r2, a("c", false));
    expect(r3.done).toBe(true);
    expect(retryId(r3)).toBeNull();
    expect(summarize(r3.answers).missed.map((m) => m.id)).toEqual(["c"]);
  });

  test("retryMissed is a no-op when nothing was missed", () => {
    const done = run(initialRun, ["a", true], ["b", true], ["c", true], ["d", true]);
    expect(retryMissed(done)).toBe(done);
  });
});
