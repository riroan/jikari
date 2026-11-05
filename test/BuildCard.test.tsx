import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { BuildCard } from "@/components/BuildCard";

afterEach(cleanup);

const item = { id: "x", markup: "わたしはがくせいです", chunks: ["わたしは", "がくせい", "です"], ko: "저는 학생입니다" };

describe("BuildCard 확인 버튼", () => {
  it("조각을 놓지 않아도 언제나 눌리고, 모자라면 오답", () => {
    const onResolved = vi.fn();
    render(<BuildCard item={item} seed={1} onResolved={onResolved} />);
    const check = screen.getByRole("button", { name: "확인" });
    expect((check as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(check);
    fireEvent.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(onResolved).toHaveBeenCalledWith(false, false);
  });

  it("순서대로 다 놓으면 정답", () => {
    const onResolved = vi.fn();
    render(<BuildCard item={item} seed={1} onResolved={onResolved} />);
    for (const c of item.chunks) fireEvent.click(screen.getByRole("button", { name: c }));
    fireEvent.click(screen.getByRole("button", { name: "확인" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(onResolved).toHaveBeenCalledWith(true, false);
  });
});
