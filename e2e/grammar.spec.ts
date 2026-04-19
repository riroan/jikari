import { test, expect } from "@playwright/test";

/**
 * Grammar-mode flow tests.
 *
 * Self-gating: if the empty state is shown (no grammar cards seeded),
 * the deeper assertions skip. Once `bun scripts/add-grammar.ts
 * data/grammar-seed-sample.json` has been run, the same tests
 * execute the full quiz flow.
 */

async function isEmpty(page: import("@playwright/test").Page): Promise<boolean> {
  return await page
    .getByText("문법 카드 준비 중")
    .isVisible({ timeout: 1000 })
    .catch(() => false);
}

test.describe("grammar study", () => {
  test("pattern tab shows study body or empty state", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/grammar?mode=study&tab=pattern");
    await expect(page.getByText("文法", { exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: /문형/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /조사/ })).toBeVisible();

    if (await isEmpty(page)) {
      test.info().annotations.push({ type: "skip-reason", description: "no grammar cards seeded" });
      return;
    }
    await expect(page.getByRole("button", { name: /이전/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /다음/ })).toBeVisible();

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("particle tab renders", async ({ page }) => {
    await page.goto("/grammar?mode=study&tab=particle");
    await expect(page.getByRole("tab", { name: /조사/ })).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("grammar quiz", () => {
  test("pattern quiz shows a question with 4 choices (when seeded)", async ({
    page,
  }) => {
    await page.goto("/grammar?tab=pattern");
    await expect(page.getByText("文法", { exact: true })).toBeVisible();

    if (await isEmpty(page)) {
      test.info().annotations.push({ type: "skip-reason", description: "no grammar cards seeded" });
      return;
    }
    await expect(page.getByText("빈칸에 들어갈 말은?")).toBeVisible();
    // Choice buttons have no aria-label; dev/nav buttons do. Simple + robust.
    const choices = page.locator("button:not([aria-label])");
    await expect(choices).toHaveCount(4, { timeout: 4000 });
  });
});
