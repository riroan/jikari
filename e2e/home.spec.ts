import { test, expect } from "@playwright/test";

test.describe("home", () => {
  test("renders brand and entry rows", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    await expect(page.getByText("jikari", { exact: true })).toBeVisible();
    await expect(page.getByText("じかり")).toBeVisible();
    await expect(page.getByText("공부", { exact: true })).toBeVisible();
    await expect(page.getByText("퀴즈", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /HOME/ })).toBeVisible();

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });
});
