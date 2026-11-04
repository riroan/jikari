import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SessionSummary } from "@/components/SessionSummary";
import { useStore } from "@/lib/store";
import { toLocalDateKey } from "@/lib/heatmap";
import { forecastDue } from "@/lib/forecast";
import type { LearningState } from "@/lib/types";
import type { RunSummary } from "@/lib/quiz-run";

let path = "/vocab/quiz";
let due: Record<string, number> = {};
vi.mock("next/navigation", () => ({ usePathname: () => path }));
let misses: unknown[] = [];
vi.mock("@/lib/use-misses", () => ({ useLiveMisses: () => misses }));
vi.mock("@/lib/use-due-by-key", () => ({ useDueByKey: () => due }));

afterEach(() => {
  cleanup();
  due = {};
  misses = [];
  useStore.setState({ heatmap: {}, learningStates: {} });
  path = "/vocab/quiz";
});

const base: RunSummary = {
  total: 10,
  correct: 7,
  accuracy: 70,
  bestStreak: 4,
  missed: [{ id: "x", correct: false, front: "猫", back: "고양이" }],
};
const ui = (s = base, onRetry = () => {}) => render(<SessionSummary summary={s} onRetry={onRetry} onNext={() => {}} />);

describe("SessionSummary", () => {
  it("renders accuracy, counts and the missed list; retry fires", () => {
    const onRetry = vi.fn();
    ui(base, onRetry);
    expect(screen.getByRole("status").textContent).toContain("70%");
    expect(screen.getByText(/10문제 중 7개 정답 · 최고 연속 4/)).toBeTruthy();
    expect(screen.getByText("猫")).toBeTruthy();
    expect(screen.getByText("고양이")).toBeTruthy();
    fireEvent.click(screen.getByText("틀린 것만 다시"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("perfect run: no missed list or retry button", () => {
    ui({ ...base, correct: 10, accuracy: 100, missed: [] });
    expect(screen.getByText("모두 맞혔어요.")).toBeTruthy();
    expect(screen.queryByText("틀린 것만 다시")).toBeNull();
  });

  it("next-review link skips the current subject and points to the top other one", () => {
    due = { vocab: 99, kanji: 3 };
    ui();
    const link = screen.getByText(/다음 복습/).closest("a")!;
    expect(link.textContent).toContain("한자 3장");
    expect(link.getAttribute("href")).toBe("/kanji");
  });

  it("no next-review link when only the current subject is due", () => {
    due = { vocab: 5 };
    ui();
    expect(screen.queryByText(/다음 복습/)).toBeNull();
  });

  describe("calm close", () => {
    const goal = () => useStore.getState().settings.dailyGoal;
    const setToday = (n: number) =>
      useStore.setState({ heatmap: { [toLocalDateKey(Date.now())]: n } });
    const labels = () =>
      [...document.querySelectorAll("section a, section button")].map((e) => e.textContent?.replace(/\s+/g, " ").trim());

    it("goal not reached: 계속하기 is a bordered button before the plain 홈으로 link", () => {
      setToday(goal() - 1);
      ui();
      expect(screen.queryByText("더 풀기")).toBeNull();
      const l = labels();
      expect(l.indexOf("계속하기")).toBeLessThan(l.indexOf("홈으로"));
      expect(screen.getByText(`오늘 ${goal() - 1}/${goal()} · 내일 예정 0장`)).toBeTruthy();
    });

    it("goal reached: 홈으로 comes first, 더 풀기 is the last plain action", () => {
      setToday(goal());
      ui();
      const l = labels();
      expect(l[0]).toBe("홈으로");
      expect(l.indexOf("더 풀기")).toBeGreaterThan(l.indexOf("틀린 것만 다시"));
      expect(screen.queryByText("계속하기")).toBeNull();
    });

    it("tomorrow count matches forecastDue", () => {
      const d = new Date();
      const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12).getTime();
      const mk = (i: number): LearningState =>
        ({ mode: "vocab", cardId: String(i), box: 1, nextDue: t, lastReviewed: 1 }) as unknown as LearningState;
      const learningStates = { a: mk(1), b: mk(2), c: mk(3) };
      useStore.setState({ learningStates });
      const n = forecastDue(learningStates, Date.now()).tomorrow;
      expect(n).toBe(3);
      ui();
      expect(screen.getByText(new RegExp(`내일 예정 ${n}장`))).toBeTruthy();
    });

    it("mistakes link only when misses exist", () => {
      ui();
      expect(screen.queryByText(/오답 노트/)).toBeNull();
      cleanup();
      misses = [{}, {}];
      ui();
      expect(screen.getByText("오답 노트 2").closest("a")!.getAttribute("href")).toBe("/mistakes");
    });
  });
});
