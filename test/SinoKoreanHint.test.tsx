import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SinoKoreanHint } from "@/components/SinoKoreanHint";

afterEach(cleanup);

describe("SinoKoreanHint", () => {
  it("규칙이 맞으면 받침·어미·예를 한 줄로 보여준다", () => {
    render(<SinoKoreanHint koreanSound={["학"]} onReadings={["がく"]} />);
    const el = screen.getByTestId("sino-korean-hint");
    expect(el.textContent).toContain("받침 ㄱ");
    expect(el.textContent).toContain("く·き");
    expect(el.textContent).toContain("학 → がく");
  });

  it("가나는 lang=ja로 표시한다 (폰트 분리)", () => {
    render(<SinoKoreanHint koreanSound={["생"]} onReadings={["せい"]} />);
    const ja = screen.getByTestId("sino-korean-hint").querySelectorAll('[lang="ja"]');
    expect([...ja].map((n) => n.textContent)).toEqual(["う·い", "せい"]);
  });

  it("규칙에 안 맞으면 아무것도 그리지 않는다", () => {
    const { container } = render(<SinoKoreanHint koreanSound={["화"]} onReadings={["か"]} />);
    expect(container.innerHTML).toBe("");
  });
});
