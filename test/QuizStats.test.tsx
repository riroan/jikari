import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { QuizStats } from "@/components/QuizStats";
import { useStore } from "@/lib/store";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  // Reset all quiz stats so each test starts from a clean slate.
  useStore.setState({
    quizStats: {
      kanji: { correct: 0, wrong: 0 },
      vocab: { correct: 0, wrong: 0 },
      sentence: { correct: 0, wrong: 0 },
      particle: { correct: 0, wrong: 0 },
      grammar: { correct: 0, wrong: 0 },
      conjugation: { correct: 0, wrong: 0 },
      adjective: { correct: 0, wrong: 0 },
      expression: { correct: 0, wrong: 0 },
    },
  });
});

describe("QuizStats", () => {
  it("returns null when no answers have been recorded yet", () => {
    const { container } = render(<QuizStats statKey="kanji" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders ◯ N · ✕ M after the user has answered", () => {
    useStore.setState({
      quizStats: {
        ...useStore.getState().quizStats,
        vocab: { correct: 7, wrong: 2 },
      },
    });
    render(<QuizStats statKey="vocab" />);
    expect(screen.getByText(/◯\s*7/)).toBeDefined();
    expect(screen.getByText(/✕\s*2/)).toBeDefined();
  });

  it("renders even when only wrong answers exist (correct=0, wrong>0)", () => {
    useStore.setState({
      quizStats: {
        ...useStore.getState().quizStats,
        sentence: { correct: 0, wrong: 3 },
      },
    });
    render(<QuizStats statKey="sentence" />);
    expect(screen.getByText(/◯\s*0/)).toBeDefined();
    expect(screen.getByText(/✕\s*3/)).toBeDefined();
  });

  it("uses accent-progress for correct, accent-korean for wrong (DESIGN.md tokens)", () => {
    useStore.setState({
      quizStats: {
        ...useStore.getState().quizStats,
        grammar: { correct: 1, wrong: 1 },
      },
    });
    render(<QuizStats statKey="grammar" />);
    const correctSpan = screen.getByText(/◯\s*1/);
    const wrongSpan = screen.getByText(/✕\s*1/);
    expect(correctSpan.className).toContain("accent-progress");
    expect(wrongSpan.className).toContain("accent-korean");
  });
});
