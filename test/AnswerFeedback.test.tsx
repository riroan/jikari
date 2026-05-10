import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AnswerFeedback } from "@/components/AnswerFeedback";

afterEach(() => {
  cleanup();
});

describe("AnswerFeedback — correct branch", () => {
  it("renders 正解 + a check icon", () => {
    render(<AnswerFeedback correct={true} />);
    expect(screen.getByText("正解")).toBeDefined();
    // SVG path is aria-hidden; just verify the element exists.
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("uses --accent-progress text color", () => {
    const { container } = render(<AnswerFeedback correct={true} />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("accent-progress");
  });

  it("announces with aria-live=polite", () => {
    const { container } = render(<AnswerFeedback correct={true} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-live")).toBe("polite");
  });

  it("hides the decorative SVG from screen readers", () => {
    render(<AnswerFeedback correct={true} />);
    const svg = document.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("AnswerFeedback — wrong branch", () => {
  it("renders 不正解 + an X icon", () => {
    render(<AnswerFeedback correct={false} />);
    expect(screen.getByText("不正解")).toBeDefined();
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("uses --accent-korean color", () => {
    const { container } = render(<AnswerFeedback correct={false} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.color).toContain("--accent-korean");
  });

  it("triggers the CSS shake animation", () => {
    const { container } = render(<AnswerFeedback correct={false} />);
    const root = container.firstChild as HTMLElement;
    expect(root.style.animation).toContain("shake");
  });

  it("announces with aria-live=polite", () => {
    const { container } = render(<AnswerFeedback correct={false} />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("aria-live")).toBe("polite");
  });

  it("hides the decorative SVG from screen readers", () => {
    render(<AnswerFeedback correct={false} />);
    const svg = document.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("AnswerFeedback — branch divergence", () => {
  it("correct vs wrong render different label text", () => {
    const { rerender } = render(<AnswerFeedback correct={true} />);
    expect(screen.getByText("正解")).toBeDefined();
    rerender(<AnswerFeedback correct={false} />);
    expect(screen.getByText("不正解")).toBeDefined();
    expect(screen.queryByText("正解")).toBeNull();
  });
});
