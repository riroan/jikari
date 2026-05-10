import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { StudyCard } from "@/components/StudyCard";

afterEach(() => {
  cleanup();
});

describe("StudyCard", () => {
  it("renders the body slot, position counter, and prev/next buttons", () => {
    render(
      <StudyCard
        body={<div data-testid="card-body">flashcard</div>}
        position={3}
        total={12}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );

    expect(screen.getByTestId("card-body")).toBeDefined();
    expect(screen.getByText("3 / 12")).toBeDefined();
    expect(screen.getByLabelText("이전 카드")).toBeDefined();
    expect(screen.getByLabelText("다음 카드")).toBeDefined();
  });

  it("calls onPrev / onNext when the matching button is clicked", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <StudyCard
        body={null}
        position={1}
        total={5}
        onPrev={onPrev}
        onNext={onNext}
      />,
    );

    fireEvent.click(screen.getByLabelText("이전 카드"));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("다음 카드"));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("marks the position counter as a polite live region", () => {
    render(
      <StudyCard
        body={null}
        position={2}
        total={7}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    const counter = screen.getByText("2 / 7");
    expect(counter.getAttribute("aria-live")).toBe("polite");
  });

  it("preserves a 44px tap target on both nav buttons (DESIGN.md § 8)", () => {
    render(
      <StudyCard
        body={null}
        position={1}
        total={1}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    const prev = screen.getByLabelText("이전 카드");
    const next = screen.getByLabelText("다음 카드");
    expect(prev.className).toContain("min-h-[44px]");
    expect(next.className).toContain("min-h-[44px]");
  });
});
