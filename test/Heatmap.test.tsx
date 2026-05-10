import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Heatmap } from "@/components/Heatmap";

afterEach(() => {
  cleanup();
});

// Anchor everything to a known date so cell keys are deterministic.
// 2026-05-10 13:00:00 local — same date the project's currentDate hint uses.
const NOW = new Date(2026, 4, 10, 13, 0, 0).getTime();

describe("Heatmap", () => {
  it("renders weeks*7 cells", () => {
    const { container } = render(<Heatmap data={{}} now={NOW} weeks={4} />);
    const cells = container.querySelectorAll("time");
    expect(cells).toHaveLength(28);
  });

  it("default 7-week layout has 49 cells", () => {
    const { container } = render(<Heatmap data={{}} now={NOW} />);
    expect(container.querySelectorAll("time")).toHaveLength(49);
  });

  it("today's cell carries an outline", () => {
    const { container } = render(<Heatmap data={{}} now={NOW} weeks={2} />);
    // generateCells pushes today last, so the final cell is "today".
    const cells = container.querySelectorAll("time");
    const today = cells[cells.length - 1] as HTMLElement;
    expect(today.style.outline).toContain("var(--fg)");
  });

  it("non-today cells have no outline", () => {
    const { container } = render(<Heatmap data={{}} now={NOW} weeks={2} />);
    const cells = container.querySelectorAll("time");
    const yesterday = cells[cells.length - 2] as HTMLElement;
    expect(yesterday.style.outline).toBe("");
  });

  it("aria-label uses Korean — 학습 없음 for empty days", () => {
    const { container } = render(<Heatmap data={{}} now={NOW} weeks={1} />);
    const cells = Array.from(container.querySelectorAll("time"));
    // Today's cell prefixes with "오늘 ", non-today doesn't.
    const yesterday = cells[cells.length - 2] as HTMLElement;
    expect(yesterday.getAttribute("aria-label")).toContain("학습 없음");
    expect(yesterday.getAttribute("aria-label")).not.toContain("오늘");
  });

  it("aria-label uses Korean — N장 for active days", () => {
    const data = { "2026-05-10": 5, "2026-05-09": 3 };
    const { container } = render(<Heatmap data={data} now={NOW} weeks={1} />);
    const cells = Array.from(container.querySelectorAll("time"));
    const today = cells[cells.length - 1] as HTMLElement;
    const yesterday = cells[cells.length - 2] as HTMLElement;
    expect(today.getAttribute("aria-label")).toContain("오늘");
    expect(today.getAttribute("aria-label")).toContain("5장");
    expect(yesterday.getAttribute("aria-label")).toContain("3장");
  });

  it("section role=list with grid-aria-label", () => {
    const { container } = render(<Heatmap data={{}} now={NOW} weeks={3} />);
    const grid = container.querySelector('[role="list"]');
    expect(grid?.getAttribute("aria-label")).toContain("3주");
  });

  it("does not apply an outline on any cell when 'now' lands outside the rendered window", () => {
    // weeks=1 = last 7 days; pass 'now' as today but pretend 'data' is empty.
    const { container } = render(<Heatmap data={{}} now={NOW} weeks={1} />);
    const cells = container.querySelectorAll("time");
    let outlined = 0;
    for (const c of cells) {
      if ((c as HTMLElement).style.outline) outlined++;
    }
    // Exactly one cell ('today') should be outlined.
    expect(outlined).toBe(1);
  });
});
