import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SessionSummary } from "@/components/SessionSummary";
import type { RunSummary } from "@/lib/quiz-run";

let path = "/vocab/quiz";
let due: Record<string, number> = {};
vi.mock("next/navigation", () => ({ usePathname: () => path }));
vi.mock("@/lib/use-due-by-key", () => ({ useDueByKey: () => due }));

afterEach(() => {
  cleanup();
  due = {};
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
});
