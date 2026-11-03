import { test, expect } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

test("/build: assemble a sentence, check, and finish the run summary", async ({ page }) => {
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.goto("/build");
  const check = page.getByRole("button", { name: "확인", exact: true });
  await expect(check).toBeDisabled();
  for (let q = 0; q < 10; q++) {
    const bank = page.getByLabel("청크").getByRole("button");
    await expect(bank.first()).toBeVisible();
    const n = await bank.count();
    for (let i = 0; i < n; i++) await bank.nth(i).click();
    await expect(check).toBeEnabled();
    await check.click();
    await expect(page.getByText(/正解|不正解/)).toBeVisible();
    await page.getByRole("button", { name: "다음 문제" }).click();
  }
  await expect(page.getByRole("region", { name: "세션 요약" })).toBeVisible();
});

test("/build: tapping a placed chunk removes it", async ({ page }) => {
  await page.goto("/build");
  const bank = page.getByLabel("청크").getByRole("button");
  await expect(bank.first()).toBeVisible();
  await bank.first().click();
  const line = page.getByLabel("만든 문장").getByRole("button");
  await expect(line).toHaveCount(1);
  await line.first().click();
  await expect(line).toHaveCount(0);
});
