import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ThemeCycleButton } from "@/components/ThemeCycleButton";
import { useStore } from "@/lib/store";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useStore.setState({
    settings: {
      theme: "system",
      showFurigana: true,
      typingThresholdBox: 4,
    },
  });
});

describe("ThemeCycleButton", () => {
  it("renders the current theme label", () => {
    useStore.setState({
      settings: {
        theme: "light",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeCycleButton />);
    expect(screen.getByRole("button").textContent).toBe("라이트");
  });

  it("cycles light → dark → system → light on each click", () => {
    useStore.setState({
      settings: {
        theme: "light",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeCycleButton />);
    const btn = screen.getByRole("button");

    // light → dark
    fireEvent.click(btn);
    expect(useStore.getState().settings.theme).toBe("dark");

    // dark → system
    fireEvent.click(btn);
    expect(useStore.getState().settings.theme).toBe("system");

    // system → light (wrap)
    fireEvent.click(btn);
    expect(useStore.getState().settings.theme).toBe("light");
  });

  it("aria-label spells out the current theme + the action", () => {
    useStore.setState({
      settings: {
        theme: "dark",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeCycleButton />);
    const btn = screen.getByRole("button");
    const label = btn.getAttribute("aria-label") ?? "";
    expect(label).toContain("다크");
    expect(label).toContain("전환");
  });

  it("accepts a custom className prop", () => {
    render(<ThemeCycleButton className="custom-x" />);
    expect(screen.getByRole("button").className).toContain("custom-x");
  });
});
