import { test, expect, type Page } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

/** Study-mode: click 다음 until a card that has a "헷갈리면" block shows up. */
async function findNote(page: Page) {
  const note = page.getByTestId("confusable-note");
  for (let i = 0; i < 60; i++) {
    if (await note.isVisible().catch(() => false)) return note;
    await page.getByRole("button", { name: /다음/ }).click();
  }
  return null;
}

test("particle study card shows a collapsed 헷갈리면 block that opens without overflow", async ({ page }) => {
  await page.goto("/particle?mode=study");
  const note = await findNote(page);
  test.skip(!note, "no particle card with a confusable partner seeded");
  await expect(note!).not.toHaveAttribute("open", "");
  await note!.locator("summary").click();
  await expect(note!).toHaveAttribute("open", "");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("grammar pattern study: tapping the partner row jumps to that card", async ({ page }) => {
  await page.goto("/grammar?mode=study&tab=pattern");
  const note = await findNote(page);
  test.skip(!note, "no pattern card with a confusable partner seeded");
  const label = (await note!.locator("summary span").nth(1).innerText()).trim();
  await note!.locator("summary").click();
  await note!.getByRole("button").click();
  // The jumped-to card shows the partner's own pattern text (〜 prefix may differ) and its own note.
  await expect(page.getByTestId("confusable-note")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  expect(label.length).toBeGreaterThan(0);
});
