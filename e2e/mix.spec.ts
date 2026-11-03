import { test, expect } from "@playwright/test";

test("/mix start screen toggles and a run reaches questions", async ({ page }) => {
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.goto("/mix");
  const kanji = page.getByRole("button", { name: "한자", exact: true });
  await expect(kanji).toHaveAttribute("aria-pressed", "true");
  await kanji.click();
  await expect(kanji).toHaveAttribute("aria-pressed", "false");
  await kanji.click();
  await page.getByRole("button", { name: "10", exact: true }).click();
  await page.getByRole("button", { name: "시작" }).click();
  await expect(page.getByText(/^1 \/ 10 · /)).toBeVisible();
  await expect(page.getByText(/^\d+ \/ 10 · (한자|단어|문장|조사|동사활용|형용사|문법|일상표현)/)).toBeVisible();
});
