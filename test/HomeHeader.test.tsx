import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HomeHeader } from "@/components/HomeHeader";

afterEach(() => {
  cleanup();
});

describe("HomeHeader — pre-hydration", () => {
  it("renders 7일 중 0일 and no aria-label so SR doesn't read stale state", () => {
    const { container } = render(
      <HomeHeader
        hydrated={false}
        studiedToday={false}
        weekDays={5}
        todayCount={0}
        dueCount={3}
      />,
    );
    // Pre-hydration the streak number inside the chip is forced to 0.
    expect(screen.getByText(/7일 중\s*0일/)).toBeDefined();
    // Due chip is gated on `hydrated` too — should not render.
    expect(screen.queryByText(/復習/)).toBeNull();
    // When `hydrated` is false the aria-label prop is undefined, so no
    // [aria-label] attribute is rendered at all — selector returns null.
    expect(container.querySelector("[aria-label]")).toBeNull();
  });
});

describe("HomeHeader — hydrated, studied today", () => {
  it("uses accent-korean color and includes the right aria-label", () => {
    const { container } = render(
      <HomeHeader
        hydrated={true}
        studiedToday={true}
        weekDays={5}
        todayCount={7}
        dueCount={0}
      />,
    );
    expect(screen.getByText(/7일 중\s*5일/)).toBeDefined();
    const streakSpan = screen.getByText(/7일 중\s*5일/);
    expect(streakSpan.className).toContain("accent-korean");
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("최근 7일 중 5일");
    expect(labelHost?.getAttribute("aria-label")).toContain("오늘 7장");
  });
});

describe("HomeHeader — hydrated, not studied yet", () => {
  it("uses fg-faint color and the 'still pending' aria-label", () => {
    const { container } = render(
      <HomeHeader
        hydrated={true}
        studiedToday={false}
        weekDays={3}
        todayCount={0}
        dueCount={0}
      />,
    );
    const streakSpan = screen.getByText(/7일 중\s*3일/);
    expect(streakSpan.className).toContain("fg-faint");
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("아직 시작 안 함");
  });

  it("describes a fresh user as 0 of 7 days", () => {
    const { container } = render(
      <HomeHeader
        hydrated={true}
        studiedToday={false}
        weekDays={0}
        todayCount={0}
        dueCount={0}
      />,
    );
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("최근 7일 중 0일");
  });
});

describe("HomeHeader — due chip", () => {
  it("renders 復習 N when dueCount > 0", () => {
    render(
      <HomeHeader
        hydrated={true}
        studiedToday={true}
        weekDays={1}
        todayCount={1}
        dueCount={12}
      />,
    );
    expect(screen.getByText(/復習\s*12/)).toBeDefined();
  });

  it("appends ', 복습 대기 N장' to aria-label when due > 0", () => {
    const { container } = render(
      <HomeHeader
        hydrated={true}
        studiedToday={true}
        weekDays={1}
        todayCount={1}
        dueCount={12}
      />,
    );
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("복습 대기 12장");
  });

  it("hides 復習 chip when dueCount is 0", () => {
    render(
      <HomeHeader
        hydrated={true}
        studiedToday={true}
        weekDays={1}
        todayCount={1}
        dueCount={0}
      />,
    );
    expect(screen.queryByText(/復習/)).toBeNull();
  });
});

describe("HomeHeader — welcome back", () => {
  const base = { hydrated: true, studiedToday: false, weekDays: 0, todayCount: 0, dueCount: 30 };
  it("shows one quiet link to /review count-free", () => {
    render(<HomeHeader {...base} welcomeBackCount={10} />);
    const link = screen.getByRole("link", { name: /오랜만이에요/ });
    expect(link.getAttribute("href")).toBe("/review");
    expect(link.textContent).toBe("오랜만이에요. 오늘은 조금만 해도 충분해요");
  });
  it("is absent by default, and before hydration", () => {
    const { rerender } = render(<HomeHeader {...base} />);
    expect(screen.queryByText(/오랜만이에요/)).toBeNull();
    rerender(<HomeHeader {...base} hydrated={false} welcomeBackCount={5} />);
    expect(screen.queryByText(/오랜만이에요/)).toBeNull();
  });
});
