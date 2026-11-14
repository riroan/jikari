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

describe("StudyCard — keyboard (desktop)", () => {
  it("← / → 키로 이전·다음 카드", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<StudyCard body={<div>x</div>} position={1} total={3} onPrev={onPrev} onNext={onNext} />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });
});

describe("StudyCard — 판정 버튼", () => {
  it("알고있음은 review(true) 후 다음으로, 되돌리기는 상태를 되돌리고 이전으로", async () => {
    const { useStore } = await import("@/lib/store");
    useStore.getState().reset();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <StudyCard
        body={<div>語</div>}
        position={1}
        total={3}
        onPrev={onPrev}
        onNext={onNext}
        grade={{ mode: "kanji", cardId: "語" }}
      />,
    );
    expect(screen.getByText(/일 후 복습/)).toBeDefined();
    fireEvent.click(screen.getByText("알고있음"));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(useStore.getState().learningStates["kanji:語"]?.box).toBe(2);
    fireEvent.click(screen.getByLabelText("직전 판정 되돌리기"));
    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(useStore.getState().learningStates["kanji:語"]).toBeUndefined();
  });

  it("다시 학습은 review(false)", async () => {
    const { useStore } = await import("@/lib/store");
    useStore.getState().reset();
    render(
      <StudyCard body={<div>x</div>} position={1} total={1} onPrev={vi.fn()} onNext={vi.fn()} grade={{ mode: "vocab", cardId: "v1" }} />,
    );
    fireEvent.click(screen.getByText("다시 학습"));
    expect(useStore.getState().learningStates["vocab:v1"]?.box).toBe(1);
    expect(useStore.getState().learningStates["vocab:v1"]?.lastReviewed).toBeGreaterThan(0);
  });

  it("grade가 없으면 이전/다음", () => {
    render(<StudyCard body={<div>x</div>} position={1} total={2} onPrev={vi.fn()} onNext={vi.fn()} />);
    expect(screen.getByLabelText("다음 카드")).toBeDefined();
    expect(screen.queryByText("알고있음")).toBeNull();
  });
});
