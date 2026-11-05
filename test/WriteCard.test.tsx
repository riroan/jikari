import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { WriteCard } from "@/components/WriteCard";

afterEach(cleanup);

const item = {
  id: "x",
  markup: "{私|わたし}は{毎朝|まいあさ}{新聞|しんぶん}を{読|よ}みます。",
  chunks: ["a", "b", "c"],
  ko: "저는 매일 아침 신문을 읽어요.",
};

function answer(text: string) {
  fireEvent.change(screen.getByLabelText("일본어 문장 입력"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "제출" }));
}

describe("WriteCard", () => {
  it("한자/가나 어느 표기로 써도 정답이고 override 버튼은 없다", () => {
    const onResolved = vi.fn();
    render(<WriteCard item={item} onResolved={onResolved} />);
    answer("わたしは毎朝しんぶんを読みます");
    expect(screen.queryByText("내 답도 맞아요")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(onResolved).toHaveBeenCalledWith(true, false);
  });

  it("틀리면 오답 처리되고, '내 답도 맞아요'를 누르면 정답으로 뒤집힌다", () => {
    const onResolved = vi.fn();
    render(<WriteCard item={item} onResolved={onResolved} />);
    answer("今日は雨です");
    fireEvent.click(screen.getByText("내 답도 맞아요"));
    fireEvent.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(onResolved).toHaveBeenCalledWith(true, false);
  });

  it("그냥 틀리면 false", () => {
    const onResolved = vi.fn();
    render(<WriteCard item={item} onResolved={onResolved} />);
    answer("今日は雨です");
    fireEvent.click(screen.getByRole("button", { name: "다음 문제" }));
    expect(onResolved).toHaveBeenCalledWith(false, false);
  });

  it("조사 하나만 틀리면 '거의 맞아요'를 알려 준다", () => {
    render(<WriteCard item={item} onResolved={vi.fn()} />);
    answer("私が毎朝新聞を読みます");
    expect(screen.getByText(/거의 맞아요/)).toBeDefined();
  });
});
