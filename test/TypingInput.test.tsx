import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TypingInput } from "@/components/TypingInput";

afterEach(cleanup);

describe("TypingInput", () => {
  it("renders input with aria-label and submit button", () => {
    render(
      <TypingInput
        ariaLabel="읽기 입력"
        lang="ja"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("읽기 입력")).toBeDefined();
    expect(screen.getByRole("button", { name: "제출" })).toBeDefined();
  });

  it("updates value on typing", () => {
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("읽기 입력") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "にち" } });
    expect(input.value).toBe("にち");
  });

  it("calls onSubmit with current value when submit button clicked", () => {
    const onSubmit = vi.fn();
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={onSubmit} />);
    const input = screen.getByLabelText("읽기 입력");
    fireEvent.change(input, { target: { value: "にち" } });
    fireEvent.click(screen.getByRole("button", { name: "제출" }));
    expect(onSubmit).toHaveBeenCalledWith("にち");
  });

  it("Enter key triggers submit (outside composition)", () => {
    const onSubmit = vi.fn();
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={onSubmit} />);
    const input = screen.getByLabelText("읽기 입력");
    fireEvent.change(input, { target: { value: "nichi" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("nichi");
  });

  it("Enter during composition does NOT submit (isComposing flag)", () => {
    const onSubmit = vi.fn();
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={onSubmit} />);
    const input = screen.getByLabelText("읽기 입력");
    fireEvent.change(input, { target: { value: "にち" } });
    fireEvent.compositionStart(input);
    // Simulate Enter with isComposing true via keyCode 229 fallback (jsdom doesn't wire nativeEvent.isComposing)
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 229 });
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    // Now Enter submits
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("にち");
  });

  it("empty input disables submit button", () => {
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={vi.fn()} />);
    const btn = screen.getByRole("button", { name: "제출" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("whitespace-only input keeps submit disabled", () => {
    const onSubmit = vi.fn();
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={onSubmit} />);
    const input = screen.getByLabelText("읽기 입력");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disabled prop disables input and submit", () => {
    render(
      <TypingInput
        ariaLabel="읽기 입력"
        lang="ja"
        disabled
        onSubmit={vi.fn()}
      />,
    );
    const input = screen.getByLabelText("읽기 입력") as HTMLInputElement;
    const btn = screen.getByRole("button", { name: "제출" }) as HTMLButtonElement;
    expect(input.disabled).toBe(true);
    expect(btn.disabled).toBe(true);
  });

  it("lang='ja' sets lang attribute on input", () => {
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("읽기 입력");
    expect(input.getAttribute("lang")).toBe("ja");
  });

  it("lang='ko' sets lang attribute on input", () => {
    render(<TypingInput ariaLabel="뜻 입력" lang="ko" onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("뜻 입력");
    expect(input.getAttribute("lang")).toBe("ko");
  });

  it("disables spellcheck / autocorrect / autocapitalize for IME safety", () => {
    render(<TypingInput ariaLabel="읽기 입력" lang="ja" onSubmit={vi.fn()} />);
    const input = screen.getByLabelText("읽기 입력");
    expect(input.getAttribute("spellcheck")).toBe("false");
    expect(input.getAttribute("autocorrect")).toBe("off");
    expect(input.getAttribute("autocapitalize")).toBe("off");
    expect(input.getAttribute("autocomplete")).toBe("off");
  });
});
