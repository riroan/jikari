import { test, expect } from "@playwright/test";

test.describe("home", () => {
  test("renders brand and subject rows with study/quiz actions", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    await expect(page.getByText("jikari", { exact: true })).toBeVisible();
    await expect(page.getByText("じかり")).toBeVisible();
    await expect(page.getByRole("link", { name: /HOME/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /PROGRESS/ })).toBeVisible();

    // Each of the 8 subjects should have a pair of 공부 / 퀴즈 links.
    const studyLinks = page.getByRole("link", { name: "공부" });
    const quizLinks = page.getByRole("link", { name: "퀴즈" });
    await expect(studyLinks).toHaveCount(8);
    await expect(quizLinks).toHaveCount(8);

    // Confirm grammar row links are present (7th row).
    await expect(page.getByRole("link", { name: "공부" }).nth(6)).toHaveAttribute(
      "href",
      "/grammar?mode=study",
    );
    await expect(page.getByRole("link", { name: "퀴즈" }).nth(6)).toHaveAttribute(
      "href",
      "/grammar",
    );

    // Confirm expressions row links are present (8th row).
    await expect(page.getByRole("link", { name: "공부" }).nth(7)).toHaveAttribute(
      "href",
      "/expressions?mode=study",
    );
    await expect(page.getByRole("link", { name: "퀴즈" }).nth(7)).toHaveAttribute(
      "href",
      "/expressions",
    );

    expect(errors, `unexpected pageerrors: ${errors.join(" | ")}`).toEqual([]);
  });
});
