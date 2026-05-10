import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { useLocalPref } from "@/lib/use-local-pref";

const KEY = "test-pref";
type Choice = "a" | "b" | "c";
const isValid = (raw: string): raw is Choice =>
  raw === "a" || raw === "b" || raw === "c";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.removeItem(KEY);
});

function Probe() {
  const [v, set] = useLocalPref<Choice>(KEY, "a", isValid);
  return (
    <div>
      <span data-testid="v">{v}</span>
      <button onClick={() => set("b")}>set-b</button>
      <button onClick={() => set("c")}>set-c</button>
    </div>
  );
}

describe("useLocalPref", () => {
  it("returns the fallback when localStorage is empty", () => {
    render(<Probe />);
    expect(screen.getByTestId("v").textContent).toBe("a");
  });

  it("reads an existing valid value from localStorage", () => {
    localStorage.setItem(KEY, "c");
    render(<Probe />);
    expect(screen.getByTestId("v").textContent).toBe("c");
  });

  it("ignores invalid stored values and falls back", () => {
    localStorage.setItem(KEY, "garbage");
    render(<Probe />);
    expect(screen.getByTestId("v").textContent).toBe("a");
  });

  it("setter writes through to localStorage", () => {
    render(<Probe />);
    fireEvent.click(screen.getByText("set-b"));
    expect(localStorage.getItem(KEY)).toBe("b");
  });

  it("setter triggers a re-render with the new value", () => {
    render(<Probe />);
    fireEvent.click(screen.getByText("set-c"));
    expect(screen.getByTestId("v").textContent).toBe("c");
  });

  it("two subscribers in the same tab stay in sync via the synthetic storage event", () => {
    function TwoProbes() {
      const [a, setA] = useLocalPref<Choice>(KEY, "a", isValid);
      const [b] = useLocalPref<Choice>(KEY, "a", isValid);
      return (
        <div>
          <span data-testid="a">{a}</span>
          <span data-testid="b">{b}</span>
          <button onClick={() => setA("c")}>change</button>
        </div>
      );
    }
    render(<TwoProbes />);
    expect(screen.getByTestId("a").textContent).toBe("a");
    expect(screen.getByTestId("b").textContent).toBe("a");
    fireEvent.click(screen.getByText("change"));
    expect(screen.getByTestId("a").textContent).toBe("c");
    expect(screen.getByTestId("b").textContent).toBe("c");
  });
});
