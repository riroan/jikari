import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EmptyCardsState } from "@/components/EmptyCardsState";

afterEach(() => {
  cleanup();
});

describe("EmptyCardsState", () => {
  it("renders the label text", () => {
    render(<EmptyCardsState label="단어 카드가 아직 없어요." hint="x" />);
    expect(screen.getByText("단어 카드가 아직 없어요.")).toBeDefined();
  });

  it("renders the hint wrapped in parentheses", () => {
    render(<EmptyCardsState label="x" hint="seed-script" />);
    expect(screen.getByText("(seed-script)")).toBeDefined();
  });

  it("hint sits in a smaller-tracking span (visual hierarchy)", () => {
    render(<EmptyCardsState label="x" hint="y" />);
    // Hint is a <span> inside the parent paragraph.
    const hint = screen.getByText("(y)");
    expect(hint.tagName).toBe("SPAN");
    expect(hint.className).toContain("tracking-wider");
  });
});
