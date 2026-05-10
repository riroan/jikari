import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { HomeHeader } from "@/components/HomeHeader";

afterEach(() => {
  cleanup();
});

describe("HomeHeader — pre-hydration", () => {
  it("renders 連続 0日 and no aria-label so SR doesn't read stale state", () => {
    const { container } = render(
      <HomeHeader
        hydrated={false}
        studiedToday={false}
        currentStreak={5}
        todayCount={0}
        dueCount={3}
      />,
    );
    // Pre-hydration the streak number inside the chip is forced to 0.
    expect(screen.getByText(/連続\s*0日/)).toBeDefined();
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
        currentStreak={5}
        todayCount={7}
        dueCount={0}
      />,
    );
    expect(screen.getByText(/連続\s*5日/)).toBeDefined();
    const streakSpan = screen.getByText(/連続\s*5日/);
    expect(streakSpan.className).toContain("accent-korean");
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("5일 연속");
    expect(labelHost?.getAttribute("aria-label")).toContain("오늘 7장");
  });
});

describe("HomeHeader — hydrated, not studied yet", () => {
  it("uses fg-faint color and the 'still pending' aria-label", () => {
    const { container } = render(
      <HomeHeader
        hydrated={true}
        studiedToday={false}
        currentStreak={3}
        todayCount={0}
        dueCount={0}
      />,
    );
    const streakSpan = screen.getByText(/連続\s*3日/);
    expect(streakSpan.className).toContain("fg-faint");
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("아직 시작 안 함");
  });

  it("describes a fresh user (no streak) as '연속 학습 없음'", () => {
    const { container } = render(
      <HomeHeader
        hydrated={true}
        studiedToday={false}
        currentStreak={0}
        todayCount={0}
        dueCount={0}
      />,
    );
    const labelHost = container.querySelector("[aria-label]");
    expect(labelHost?.getAttribute("aria-label")).toContain("연속 학습 없음");
  });
});

describe("HomeHeader — due chip", () => {
  it("renders 復習 N when dueCount > 0", () => {
    render(
      <HomeHeader
        hydrated={true}
        studiedToday={true}
        currentStreak={1}
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
        currentStreak={1}
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
        currentStreak={1}
        todayCount={1}
        dueCount={0}
      />,
    );
    expect(screen.queryByText(/復習/)).toBeNull();
  });
});
