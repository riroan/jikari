import { test, expect } from "@playwright/test";

/**
 * Smoke: each mode route renders without JS errors.
 *
 * Does NOT exercise quiz logic — that requires MySQL content. This only
 * verifies the shell (header, HOME link) renders on each route.
 */
const routes = [
  { path: "/kanji", jp: "漢字" },
  { path: "/kanji?mode=study", jp: "漢字" },
  { path: "/vocab", jp: "単語" },
  { path: "/vocab?mode=study", jp: "単語" },
  { path: "/sentence", jp: "文章" },
  { path: "/sentence?mode=study", jp: "文章" },
  { path: "/conjugation", jp: null },
  { path: "/adjective", jp: null },
  { path: "/particle", jp: null },
  { path: "/grammar", jp: "文法" },
  { path: "/grammar?mode=study", jp: "文法" },
  { path: "/grammar?tab=particle", jp: "文法" },
  { path: "/grammar?mode=study&tab=particle", jp: "文法" },
  { path: "/expressions", jp: "表現" },
  { path: "/expressions?mode=study", jp: "表現" },
  { path: "/progress", jp: null },
  { path: "/settings", jp: null },
];

for (const { path, jp } of routes) {
  test(`${path} loads`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(path);

    await expect(page.getByRole("link", { name: /HOME/ })).toBeVisible();
    if (jp) {
      await expect(page.getByText(jp, { exact: true })).toBeVisible();
    }

    expect(errors, `unexpected pageerrors on ${path}: ${errors.join(" | ")}`).toEqual([]);
  });
}
