import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("@/lib/srs", async (orig) => ({ ...(await orig<object>()), markAnswered: () => true }));
import { QuizCard } from "@/components/QuizCard";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("QuizCard — slow-correct + memo", () => {
  it("slow correct shows no note (still recorded via markAnswered); memo sits in the tail below the button row", () => {
    localStorage.setItem("jikari-memos-v1", JSON.stringify([{ key: "vocab:v1", text: "내 메모", at: 1 }]));
    render(
      <QuizCard
        question={<div>Q</div>}
        input={{ mode: "choice", choices: ["a", "b"], correct: "a" }}
        memoKey="vocab:v1"
        onResolved={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("a"));
    expect(screen.queryByText(/느렸어요/)).toBeNull();
    const memo = screen.getByText("내 메모");
    const tail = screen.getByTestId("quiz-tail");
    expect(tail.contains(memo)).toBe(true);
    const next = screen.getByRole("button", { name: "다음 문제" });
    // DOM order: status row (next) before the memo tail.
    expect(next.compareDocumentPosition(tail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
