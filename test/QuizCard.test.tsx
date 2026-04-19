import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { QuizCard } from "@/components/QuizCard";

afterEach(() => {
  cleanup();
});

const clickNext = () =>
  fireEvent.click(screen.getByRole("button", { name: "다음 문제" }));

describe("QuizCard — choice mode regression", () => {
  it("renders choices and fires onResolved with correctness after 다음", () => {
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
    expect(onResolved).not.toHaveBeenCalled();
    clickNext();
    expect(onResolved).toHaveBeenCalledWith(true);
  });

  it("wrong choice resolves with false after 다음", () => {
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
    expect(onResolved).not.toHaveBeenCalled();
    clickNext();
    expect(onResolved).toHaveBeenCalledWith(false);
  });
});

describe("QuizCard — typed mode", () => {
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
    clickNext();
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
    clickNext();
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
    clickNext();
    expect(onResolved).toHaveBeenCalledWith(true);
  });
});
