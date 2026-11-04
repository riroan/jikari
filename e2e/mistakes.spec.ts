import { test, expect } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

test("/mistakes lists logged misses, clears with undo, and starts a retry run", async ({ page }) => {
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.goto("/mistakes");
  await expect(page.getByText("틀린 카드가 없어요")).toBeVisible();

  // Seed the log with a real kanji card id taken from the kanji quiz page's data.
  const id = await page.evaluate(async () => (await (await fetch("/api/cards")).json()).kanji[0].id);
  await page.evaluate(
    (id) => localStorage.setItem("jikari-misses-v1", JSON.stringify([{ key: `kanji:${id}`, count: 3, ok: 0, last: Date.now() }])),
    id,
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: /오답 노트/ })).toBeVisible();
  await page.getByRole("link", { name: /오답 노트/ }).click();
  await expect(page.getByRole("heading", { name: "오늘" })).toBeVisible();
  await expect(page.getByText("✕ 3")).toBeVisible();

  await page.getByRole("button", { name: /지우기/ }).click();
  await page.getByRole("button", { name: "되돌리기" }).click();
  await expect(page.getByText("✕ 3")).toBeVisible();

  await page.getByRole("button", { name: "틀린 것만 다시" }).click();
  await expect(page.getByText(/^1 \/ 1/)).toBeVisible();
});

test("/mistakes: leech group, memo persists across reload, field stays reachable above the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.goto("/mistakes");
  const id = await page.evaluate(async () => (await (await fetch("/api/cards")).json()).kanji[0].id);
  await page.evaluate(
    (id) => localStorage.setItem("jikari-misses-v1", JSON.stringify([{ key: `kanji:${id}`, count: 5, ok: 0, last: Date.now() }])),
    id,
  );
  await page.reload();
  await expect(page.getByRole("heading", { name: "자주 틀림" })).toBeVisible();
  await expect(page.getByText("✕ 5")).toBeVisible();
  await expect(page.locator("li [lang=ja]").first()).toBeVisible();

  await page.getByText("✕ 5").click();
  const memo = page.getByLabel("내 메모 (연상)");
  await expect(memo).toHaveAttribute("lang", "ko");
  await memo.fill("나무 위에 해");
  // iOS keyboard: visual viewport shrinks to ~half; the field must be scrolled into it after focus.
  await page.setViewportSize({ width: 393, height: 420 });
  await memo.focus();
  await page.waitForTimeout(900);
  const box = await memo.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(420);
  await memo.blur();

  await page.reload();
  await expect(page.getByText("나무 위에 해")).toBeVisible();
  await expect(page.getByText("나무 위에 해")).toHaveAttribute("lang", "ko");
});
