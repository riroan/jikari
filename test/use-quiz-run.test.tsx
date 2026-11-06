import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuizRun } from "@/lib/use-quiz-run";

describe("useQuizRun", () => {
  it("run length = min(10, deck length)", () => {
    const { result } = renderHook(() => useQuizRun(2));
    act(() => result.current.record("a", true, "a", "A"));
    expect(result.current.summary).toBeNull();
    act(() => result.current.record("b", true, "b", "B"));
    expect(result.current.summary?.total).toBe(2);

    const big = renderHook(() => useQuizRun(50));
    for (let i = 0; i < 9; i++) act(() => big.result.current.record(`c${i}`, true, "", ""));
    expect(big.result.current.summary).toBeNull();
    act(() => big.result.current.record("c9", true, "", ""));
    expect(big.result.current.summary?.total).toBe(10);
  });

  it("endless pref never ends the run, except when the caller opts out", () => {
    localStorage.setItem("jikari-run-length", "endless");
    try {
      const { result } = renderHook(() => useQuizRun(2));
      for (let i = 0; i < 30; i++) act(() => result.current.record(`c${i}`, true, "", ""));
      expect(result.current.summary).toBeNull();

      const mix = renderHook(() => useQuizRun(2, 2, false));
      act(() => mix.result.current.record("a", true, "", ""));
      act(() => mix.result.current.record("b", true, "", ""));
      expect(mix.result.current.summary?.total).toBe(2);
    } finally {
      localStorage.removeItem("jikari-run-length");
    }
  });

  it("retry round counts only its own answers and ends with the queue", () => {
    const { result } = renderHook(() => useQuizRun(2));
    act(() => result.current.record("a", false, "a", "A"));
    act(() => result.current.record("b", true, "b", "B"));
    act(() => result.current.retryMissed());
    expect(result.current.retrying).toBe(true);
    expect(result.current.retryId).toBe("a");
    expect(result.current.summary).toBeNull();
    act(() => result.current.record("a", true, "a", "A"));
    expect(result.current.retrying).toBe(false);
    expect(result.current.summary).toMatchObject({ total: 1, correct: 1, accuracy: 100 });
    expect(result.current.summary?.missed).toEqual([]);
  });
});
