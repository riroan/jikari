import { test, expect } from "@playwright/test";

/**
 * Home-page chapter mastery section + regression on existing home elements.
 *
 * Self-gating: if no chapters are seeded (UNITS section absent), only the
 * regression assertions run. Once `bun run scripts/import-chapters.ts` is
 * run, the deeper assertions execute.
 */
test.describe("home — chapter mastery", () => {
  test("UNITS section renders without breaking existing home elements", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // Regression: brand + streak + 7 subject rows + footer nav still visible.
    await expect(page.getByRole("heading", { name: "jikari", level: 1 })).toBeVisible();
    await expect(page.getByText("じかり")).toBeVisible();
    await expect(page.getByRole("link", { name: "공부" })).toHaveCount(7);
    await expect(page.getByRole("link", { name: "퀴즈" })).toHaveCount(7);
    await expect(page.getByRole("link", { name: /^HOME/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^SETTINGS/ })).toBeVisible();

    // 7 WEEKS heatmap label still present (post-chapters).
    await expect(page.getByText("7 WEEKS")).toBeVisible();

    // Chapter mastery: render conditional on seed presence.
    const unitsLabel = page.getByText("UNITS", { exact: true });
    if (await unitsLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Seeded path — at least one chapter row should exist.
      const list = page.locator("section[aria-labelledby='chapters-label'] li");
      await expect(list.first()).toBeVisible();
      const count = await list.count();
      expect(count).toBeGreaterThanOrEqual(1);

      // Mastery bar uses the documented role/aria pattern.
      const firstBar = list
        .first()
        .getByRole("img", { name: /마스터리/ });
      await expect(firstBar).toBeVisible();
    } else {
      test
        .info()
        .annotations.push({
          type: "skip-reason",
          description: "no chapters seeded — UNITS section hidden (expected pre-seed)",
        });
    }

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });
});
