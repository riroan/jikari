import { test, expect } from "@playwright/test";

// Needs a PRODUCTION build (the SW is registered only when NODE_ENV=production):
//   OFFLINE_PROD=1 BASE_URL=http://localhost:3666 playwright test offline-shell
// PUT /api/progress is always aborted + recorded, so a real DB is never written.
test.skip(!process.env.OFFLINE_PROD, "production build only");

test("app opens offline from the SW cache, queues answers, syncs merged when back online", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "Playwright WebKit setOffline breaks SW navigations; verified by killing the server instead");
  const puts: Record<string, unknown>[] = [];
  await context.route("**/api/progress", (route) => {
    const req = route.request();
    if (req.method() !== "PUT") return route.fallback();
    puts.push(req.postDataJSON());
    return route.abort("failed");
  });

  // online: warm caches, then reload so the page is SW-controlled
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.goto("/vocab");
  await page.reload();
  const choice = page.locator("div.flex.flex-col.gap-2 > button").first();
  await page.getByRole("textbox").or(choice).waitFor();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto("/"); // also cache the home route
  await expect(page.getByRole("link", { name: "공부" }).first()).toBeVisible();

  // offline: reload an already-seen route and an unseen one
  await context.setOffline(true);
  await page.goto("/vocab");
  await page.getByRole("textbox").or(choice).waitFor({ timeout: 15_000 });
  const box = page.getByRole("textbox");
  if (await box.isVisible()) {
    await box.fill("x");
    await box.press("Enter");
  } else {
    await choice.click();
  }
  await page.getByRole("button", { name: "다음 문제" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jikari-pending-v1") != null)).toBe(true);
  await expect(page.getByText("오프라인 — 풀이는 저장돼요")).toBeVisible();
  expect(puts.length).toBeLessThanOrEqual(0);

  await page.goto("/settings"); // never visited online: static offline page, not another route's HTML
  await expect(page.locator("body")).toContainText("이 화면은 아직 저장되지 않았어요");

  // back online: fresh GET -> merge -> one PUT (aborted by the mock), pending kept because the PUT "failed"
  await context.setOffline(false);
  await page.goto("/vocab");
  await expect.poll(() => puts.length, { timeout: 20_000 }).toBeGreaterThan(0);
  const body = puts[0] as { learningStates: Record<string, unknown> };
  expect(Object.keys(body.learningStates).some((k) => k.startsWith("vocab:"))).toBe(true);
});
