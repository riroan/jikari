import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { QuizCard } from "@/components/QuizCard";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("QuizCard — choice mode regression", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders choices and fires onResolved with correctness", () => {
    const onResolved = vi.fn();
    render(
      <QuizCard
        question={<div>日</div>}
        input={{
          mode: "choice",
          choices: ["にち", "ひ", "じつ", "か"],
          correct: "にち",
        }}
        onResolved={onResolved}
      />,
    );

    fireEvent.click(screen.getByText("にち"));
    // Wait out the feedback hold (1500ms, no back)
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onResolved).toHaveBeenCalledWith(true);
  });

  it("wrong choice resolves with false", () => {
    const onResolved = vi.fn();
    render(
      <QuizCard
        question={<div>日</div>}
        input={{
          mode: "choice",
          choices: ["にち", "ひ", "じつ", "か"],
          correct: "にち",
        }}
        onResolved={onResolved}
      />,
    );
    fireEvent.click(screen.getByText("ひ"));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onResolved).toHaveBeenCalledWith(false);
  });
});

describe("QuizCard — typed mode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("typed Japanese matches acceptable answer via normalizer (romaji → hiragana)", () => {
    const onResolved = vi.fn();
    render(
      <QuizCard
        question={<div>日</div>}
        input={{
          mode: "typed",
          acceptableAnswers: ["にち", "じつ"],
          lang: "ja",
        }}
        onResolved={onResolved}
      />,
    );
    const input = screen.getByLabelText("読み入력");
    fireEvent.change(input, { target: { value: "nichi" } });
    fireEvent.click(screen.getByRole("button", { name: "제출" }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onResolved).toHaveBeenCalledWith(true);
  });

  it("typed Japanese wrong answer resolves false", () => {
    const onResolved = vi.fn();
    render(
      <QuizCard
        question={<div>日</div>}
        input={{
          mode: "typed",
          acceptableAnswers: ["にち", "じつ"],
          lang: "ja",
        }}
        onResolved={onResolved}
      />,
    );
    const input = screen.getByLabelText("読み入력");
    fireEvent.change(input, { target: { value: "bogus" } });
    fireEvent.click(screen.getByRole("button", { name: "제출" }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onResolved).toHaveBeenCalledWith(false);
  });

  it("typed Korean meaning matches via normalizeKorean", () => {
    const onResolved = vi.fn();
    render(
      <QuizCard
        question={<div>食べる</div>}
        input={{
          mode: "typed",
          acceptableAnswers: ["먹다"],
          lang: "ko",
        }}
        onResolved={onResolved}
      />,
    );
    const input = screen.getByLabelText("뜻 입력");
    fireEvent.change(input, { target: { value: "먹다." } });
    fireEvent.click(screen.getByRole("button", { name: "제출" }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(onResolved).toHaveBeenCalledWith(true);
  });
});
