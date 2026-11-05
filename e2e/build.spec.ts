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
  await page.getByRole("button", { name: "시작" }).click();
  // 확인은 언제나 눌린다 (조각 수와 상관없이 채점).
  const check = page.getByRole("button", { name: "확인", exact: true });
  await expect(check).toBeEnabled();
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
  await page.getByRole("button", { name: "시작" }).click();
  const bank = page.getByLabel("청크").getByRole("button");
  await expect(bank.first()).toBeVisible();
  await bank.first().click();
  const line = page.getByLabel("만든 문장").getByRole("button");
  await expect(line).toHaveCount(1);
  await line.first().click();
  await expect(line).toHaveCount(0);
});

test("/build: hint places the first chunk once; hard mode adds unused chunks", async ({ page }) => {
  await page.goto("/build");
  await page.getByRole("button", { name: /^어려움/ }).click();
  await page.getByRole("button", { name: "시작" }).click();
  const bank = page.getByLabel("청크").getByRole("button");
  await expect(bank.first()).toBeVisible();
  const hint = page.getByRole("button", { name: "첫 조각 보기" });
  await hint.click();
  await expect(page.getByLabel("만든 문장").getByRole("button")).toHaveCount(1);
  await expect(hint).toBeDisabled();
  const total = await bank.count();
  expect(total).toBeGreaterThanOrEqual(4);
  await page.getByLabel("청크").locator("button:enabled").first().click();
  await expect(page.getByLabel("만든 문장").getByRole("button")).toHaveCount(2);
});
