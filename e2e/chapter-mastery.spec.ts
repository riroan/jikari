import { test, expect } from "@playwright/test";

/**
 * /chapters route + home footer integration.
 *
 * Self-gating: if no chapters seeded, deeper /chapters assertions skip.
 */
test.describe("home — UNITS footer link", () => {
  test("home shows UNITS link in footer (alongside HOME/PROGRESS/SETTINGS)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // Regression: brand + 7 subject rows + heatmap + footer still visible.
    await expect(page.getByRole("heading", { name: "jikari", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "공부" })).toHaveCount(7);
    await expect(page.getByRole("link", { name: "퀴즈" })).toHaveCount(7);
    await expect(page.getByText("7 WEEKS")).toBeVisible();

    // New footer entry. Use exact text to avoid matching the back-link "← HOME".
    const unitsLink = page.getByRole("link", { name: /^UNITS$/ });
    await expect(unitsLink).toBeVisible();
    await expect(unitsLink).toHaveAttribute("href", "/chapters");

    // Existing footer items still present.
    await expect(page.getByRole("link", { name: /^HOME$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^PROGRESS$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^SETTINGS$/ })).toBeVisible();

    // UNITS section is NOT rendered inline on home anymore (moved to /chapters).
    await expect(page.getByText("UNITS").first()).toBeVisible();
    // The inline chapter list (section[aria-labelledby='chapters-label']) should be absent.
    await expect(page.locator("section[aria-labelledby='chapters-label']")).toHaveCount(0);

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });
});

test.describe("/chapters page", () => {
  test("renders header + UNITS list", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/chapters");

    // Header — back-to-home + 単元 H1 (matches mode-page pattern).
    await expect(page.getByRole("link", { name: "← HOME" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "単元", level: 1 })).toBeVisible();

    // List visible when seeded; otherwise empty (component returns null).
    const list = page.locator("section[aria-labelledby='chapters-label'] li");
    if ((await list.count()) > 0) {
      await expect(list.first()).toBeVisible();
      await expect(list.first().getByRole("img", { name: /마스터리/ })).toBeVisible();
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
