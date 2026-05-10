import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { useIsClient, useClientNow } from "@/lib/use-is-client";

afterEach(() => {
  cleanup();
});

function IsClientProbe() {
  const v = useIsClient();
  return <div data-testid="probe">{String(v)}</div>;
}

function NowProbe() {
  const v = useClientNow();
  return <div data-testid="probe">{v === null ? "null" : String(v)}</div>;
}

describe("useIsClient", () => {
  it("returns true after client-side render", () => {
    render(<IsClientProbe />);
    expect(screen.getByTestId("probe").textContent).toBe("true");
  });

  it("yields the same value on multiple renders within the same tree", () => {
    function DoubleProbe() {
      const a = useIsClient();
      const b = useIsClient();
      return (
        <div>
          <span data-testid="a">{String(a)}</span>
          <span data-testid="b">{String(b)}</span>
        </div>
      );
    }
    render(<DoubleProbe />);
    expect(screen.getByTestId("a").textContent).toBe(
      screen.getByTestId("b").textContent,
    );
  });
});

describe("useClientNow", () => {
  it("returns a number after client-side render", () => {
    render(<NowProbe />);
    const text = screen.getByTestId("probe").textContent ?? "";
    expect(text).not.toBe("null");
    const n = Number(text);
    expect(Number.isFinite(n)).toBe(true);
    expect(n).toBeGreaterThan(0);
  });

  it("caches the timestamp module-wide so multiple components see the same value", () => {
    function TwoNowProbes() {
      return (
        <>
          <div data-testid="a">{String(useClientNow())}</div>
          <div data-testid="b">{String(useClientNow())}</div>
        </>
      );
    }
    render(<TwoNowProbes />);
    expect(screen.getByTestId("a").textContent).toBe(
      screen.getByTestId("b").textContent,
    );
  });

  it("is approximately Date.now() at first call", () => {
    const before = Date.now();
    render(<NowProbe />);
    const after = Date.now();
    const cached = Number(screen.getByTestId("probe").textContent);
    // Cached timestamp may have been set in an earlier test (module-level
    // cache); just assert it's a sensible recent timestamp, not a specific
    // window — within the last 24 hours of "after".
    const oneDay = 24 * 60 * 60 * 1000;
    expect(cached).toBeGreaterThan(after - oneDay);
    expect(cached).toBeLessThanOrEqual(before + 1_000);
  });
});
