import { test, expect } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

test("/reading: peek counts as a miss and resurfaces; clean reads finish the run", async ({ page }) => {
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.goto("/reading");
  const peek = page.getByRole("button", { name: /^읽기 보기/ });
  await expect(peek.first()).toBeVisible();
  await expect(page.locator("rt")).toHaveCount(0); // furigana hidden

  // Q1: peek one word -> rt for that word only, then reveal; forced miss.
  const count = await peek.count();
  await peek.first().click();
  await expect(page.locator("rt")).toHaveCount(1);
  expect(await peek.count()).toBe(count - 1);
  await page.getByRole("button", { name: "정답 확인" }).click();
  await expect(page.getByText("엿봤어요 · 다시 나와요")).toBeVisible();
  await expect(page.getByRole("button", { name: "맞았어요" })).toHaveCount(0);
  await page.getByRole("button", { name: "다음 문제" }).click();
  const weak = await page.evaluate(() => JSON.parse(localStorage.getItem("jikari:reading-weak") ?? "[]"));
  expect(weak).toHaveLength(1);

  // Q2..Q10: read cleanly.
  for (let q = 1; q < 10; q++) {
    await page.getByRole("button", { name: "정답 확인" }).click();
    await expect(page.getByRole("button", { name: "발음 듣기" })).toBeVisible();
    await page.getByRole("button", { name: "맞았어요" }).click();
  }
  const summary = page.getByRole("region", { name: "세션 요약" });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText("90");
});
