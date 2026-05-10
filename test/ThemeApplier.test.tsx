import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ThemeApplier } from "@/components/ThemeApplier";
import { useStore } from "@/lib/store";

// jsdom doesn't ship a matchMedia polyfill — we install a minimal stub
// so the "system" branch can subscribe without throwing.
function installMatchMediaStub() {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches: false,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) =>
      listeners.add(cb),
    removeEventListener: (_t: string, cb: (e: MediaQueryListEvent) => void) =>
      listeners.delete(cb),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn(() => mql);
  return { mql, listeners };
}

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-theme");
  localStorage.removeItem("jikari-theme");
});

beforeEach(() => {
  installMatchMediaStub();
  useStore.setState({
    settings: {
      theme: "system",
      showFurigana: true,
      typingThresholdBox: 4,
    },
  });
});

describe("ThemeApplier", () => {
  it("renders nothing (returns null)", () => {
    const { container } = render(<ThemeApplier />);
    expect(container.firstChild).toBeNull();
  });

  it('theme="light" → sets data-theme="light" + localStorage hint', () => {
    useStore.setState({
      settings: {
        theme: "light",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeApplier />);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("jikari-theme")).toBe("light");
  });

  it('theme="dark" → sets data-theme="dark" + localStorage hint', () => {
    useStore.setState({
      settings: {
        theme: "dark",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeApplier />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("jikari-theme")).toBe("dark");
  });

  it('theme="system" → removes data-theme + localStorage hint', () => {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem("jikari-theme", "light");
    useStore.setState({
      settings: {
        theme: "system",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeApplier />);
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(localStorage.getItem("jikari-theme")).toBeNull();
  });

  it("does not throw when localStorage.setItem rejects (private mode etc.)", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    useStore.setState({
      settings: {
        theme: "dark",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    expect(() => render(<ThemeApplier />)).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
    Storage.prototype.setItem = original;
  });

  it('theme="system" subscribes to matchMedia change events', () => {
    const { listeners } = installMatchMediaStub();
    render(<ThemeApplier />);
    expect(listeners.size).toBe(1);
  });

  it('non-system themes do NOT subscribe to matchMedia (no listener leak)', () => {
    const { listeners } = installMatchMediaStub();
    useStore.setState({
      settings: {
        theme: "light",
        showFurigana: true,
        typingThresholdBox: 4,
      },
    });
    render(<ThemeApplier />);
    expect(listeners.size).toBe(0);
  });

  it("unmounting unsubscribes the matchMedia listener", () => {
    const { listeners } = installMatchMediaStub();
    const { unmount } = render(<ThemeApplier />);
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
