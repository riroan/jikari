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
    expect(screen.getByRole("button", { name: /にち 정답/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /ひ 선택 · 오답/ }).hasAttribute("disabled")).toBe(true);
    expect(onResolved).not.toHaveBeenCalled();
    clickNext();
    expect(onResolved).toHaveBeenCalledWith(false, "ひ");
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

describe("QuizCard — miss example + memo tail", () => {
  const ex = { ruby: "[[本|ほん]]を読む", ko: "책을 읽다", plain: "本を読む" };
  const choice = {
    mode: "choice" as const,
    choices: ["a", "b"],
    correct: "a",
  };
  const ui = (extra: Partial<React.ComponentProps<typeof QuizCard>> = {}) => (
    <QuizCard question={<div>Q</div>} input={choice} onResolved={() => {}} {...extra} />
  );

  it("wrong answer shows the example (ko translation + speaker); right answer and no-example show nothing", () => {
    render(ui({ missExample: ex }));
    expect(screen.queryByTestId("quiz-tail")).toBeNull();
    fireEvent.click(screen.getByText("b"));
    expect(screen.getByText("책을 읽다")).toBeTruthy();
    cleanup();

    render(ui({ missExample: ex }));
    fireEvent.click(screen.getByText("a"));
    expect(screen.queryByText("책을 읽다")).toBeNull();
    expect(screen.queryByTestId("quiz-tail")).toBeNull();
    cleanup();

    render(ui({ missExample: null }));
    fireEvent.click(screen.getByText("b"));
    expect(screen.queryByTestId("quiz-tail")).toBeNull();
  });

  it("wrong + example + memo stacks example above memo; memo shows on correct too", () => {
    localStorage.setItem("jikari-memos-v1", JSON.stringify([{ key: "vocab:v1", text: "책 = 본", at: 1 }]));
    render(ui({ missExample: ex, memoKey: "vocab:v1" }));
    expect(screen.queryByText("책 = 본")).toBeNull(); // nothing before answering
    fireEvent.click(screen.getByText("b"));
    const tail = screen.getByTestId("quiz-tail");
    expect(tail.textContent).toMatch(/책을 읽다.*책 = 본/);
    expect(screen.getByText("책 = 본").getAttribute("lang")).toBe("ko");
    cleanup();

    render(ui({ missExample: ex, memoKey: "vocab:v1" }));
    fireEvent.click(screen.getByText("a"));
    expect(screen.getByText("책 = 본")).toBeTruthy();
    expect(screen.queryByText("책을 읽다")).toBeNull();
    localStorage.clear();
  });

  it("other card's memo is not shown", () => {
    localStorage.setItem("jikari-memos-v1", JSON.stringify([{ key: "vocab:v2", text: "다른 메모", at: 1 }]));
    render(ui({ memoKey: "vocab:v1" }));
    fireEvent.click(screen.getByText("a"));
    expect(screen.queryByText("다른 메모")).toBeNull();
    localStorage.clear();
  });
});

describe("QuizCard — keyboard choice (desktop)", () => {
  it("숫자 키 1–4로 선지를 고른다", () => {
    const onResolved = vi.fn();
    render(
      <QuizCard
        question={<div>日</div>}
        input={{ mode: "choice", choices: ["にち", "ひ", "じつ", "か"], correct: "にち" }}
        onResolved={onResolved}
      />,
    );
    fireEvent.keyDown(window, { key: "2" });
    expect(onResolved).not.toHaveBeenCalled();
    clickNext();
    expect(onResolved).toHaveBeenCalledWith(false, "ひ");
  });

  it("입력창에서 숫자를 쳐도 선지가 눌리지 않는다", () => {
    render(
      <>
        <input aria-label="x" />
        <QuizCard
          question={<div>日</div>}
          input={{ mode: "choice", choices: ["にち", "ひ", "じつ", "か"], correct: "にち" }}
          onResolved={vi.fn()}
        />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("x"), { key: "1" });
    expect(screen.queryByText("다음 →")).toBeNull();
  });
});
