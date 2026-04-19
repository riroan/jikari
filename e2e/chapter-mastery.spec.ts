import { test, expect } from "@playwright/test";

/**
 * /chapters route + home footer integration.
 *
 * Self-gating: if no chapters seeded, deeper /chapters assertions skip.
 */
test.describe("home — 단원 entry button", () => {
  test("home shows 단원 button between header and subject rows", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // Regression: brand + 7 subject rows + heatmap + footer still visible.
    await expect(page.getByRole("heading", { name: "jikari", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "공부" })).toHaveCount(7);
    await expect(page.getByRole("link", { name: "퀴즈" })).toHaveCount(7);
    await expect(page.getByText("7 WEEKS")).toBeVisible();

    // 단원 entry — top of page, not in footer.
    const unitsLink = page.getByRole("link", { name: /단원/ });
    await expect(unitsLink).toBeVisible();
    await expect(unitsLink).toHaveAttribute("href", "/chapters");

    // Footer no longer carries UNITS — only HOME/PROGRESS/SETTINGS.
    const footer = page.locator("nav").last();
    await expect(footer.getByRole("link", { name: /^HOME$/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /^PROGRESS$/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /^SETTINGS$/ })).toBeVisible();
    await expect(footer.getByRole("link", { name: /^UNITS$/ })).toHaveCount(0);

    // Inline chapter list NOT rendered on home (moved to /chapters route).
    await expect(page.locator("section[aria-labelledby='chapters-label']")).toHaveCount(0);

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });
});

test.describe("/chapters page", () => {
  test("renders header + UNITS list with clickable rows", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/chapters");

    // Header — back-to-home + 単元 H1.
    await expect(page.getByRole("link", { name: "← HOME" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "単元", level: 1 })).toBeVisible();

    const list = page.locator("section[aria-labelledby='chapters-label'] li");
    if ((await list.count()) > 0) {
      await expect(list.first()).toBeVisible();
      // Rows are now <Link>, not div — must have href to /chapters/[id].
      const firstLink = list.first().getByRole("link").first();
      await expect(firstLink).toBeVisible();
      await expect(firstLink).toHaveAttribute("href", /^\/chapters\/[^/]+$/);
    } else {
      test.info().annotations.push({
        type: "skip-reason",
        description: "no chapters seeded — list hidden (expected pre-seed)",
      });
    }

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("← HOME from /chapters navigates back to home", async ({ page }) => {
    await page.goto("/chapters");
    await page.getByRole("link", { name: "← HOME" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "jikari", level: 1 })).toBeVisible();
  });
});

test.describe("/chapters/[id] detail page", () => {
  test("a2-food chapter renders overview with intro + cards + quiz button", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/chapters/a2-food");

    // Header (← UNITS + 음식·식사 H1)
    await expect(page.getByRole("link", { name: "← UNITS" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "음식·식사", level: 1 })).toBeVisible();

    // Overview sections
    await expect(page.getByText("MASTERY")).toBeVisible();
    await expect(page.getByText("ABOUT")).toBeVisible();
    await expect(page.getByText("CARDS")).toBeVisible();

    // Quiz CTA
    const quizButton = page.getByRole("link", { name: /이 챕터 퀴즈 시작/ });
    await expect(quizButton).toBeVisible();
    await expect(quizButton).toHaveAttribute("href", "/chapters/a2-food?mode=quiz");

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("clicking quiz button enters quiz mode with progress counter", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/chapters/a2-food");
    await page.getByRole("link", { name: /이 챕터 퀴즈 시작/ }).click();

    await expect(page).toHaveURL(/\/chapters\/a2-food\?mode=quiz/);
    // Progress counter "1 / N" + tally "◯ 0 ・ ✕ 0" present at top.
    await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
    await expect(page.getByText(/◯ 0 ・ ✕ 0/)).toBeVisible();

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("nonexistent chapter id shows NotFound", async ({ page }) => {
    await page.goto("/chapters/no-such-chapter");
    await expect(page.getByText(/챕터를 찾을 수 없습니다/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /단원 목록으로/ }),
    ).toBeVisible();
  });
});
