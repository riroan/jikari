import { test, expect } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

// /api/progress is fully mocked: never touches the real DB.
const server = {
  schemaVersion: 6,
  learningStates: {
    "vocab:from-other-device": {
      cardKey: "vocab:from-other-device", mode: "vocab", cardId: "from-other-device",
      box: 3, nextDue: 4102444800000, correctStreak: 2, lastReviewed: 1,
    },
  },
  heatmap: {}, lastActiveAt: 1, currentStreak: 0, quizStats: {}, ratings: {},
  settings: { theme: "system", showFurigana: true, typingThresholdBox: 4, dailyGoal: 20 },
};

test("answers given offline survive a reload and flush merged once online", async ({ page, context }) => {
  const puts: Record<string, unknown>[] = [];
  let up = true; // route mocks bypass context.setOffline, so mirror it here
  await page.route("**/api/progress", async (route) => {
    const req = route.request();
    if (!up) return route.abort("internetdisconnected");
    if (req.method() === "PUT") {
      puts.push(req.postDataJSON());
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: server });
  });

  await page.goto("/vocab");
  const choice = page.locator("div.flex.flex-col.gap-2 > button").first();
  await page.getByRole("textbox").or(choice).waitFor();
  up = false;
  await context.setOffline(true);
  const box = page.getByRole("textbox");
  if (await box.isVisible()) {
    await box.fill("x");
    await box.press("Enter");
  } else {
    await choice.click();
  }
  await page.getByRole("button", { name: "다음 문제" }).click(); // review() fires when the answer is resolved
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jikari-pending-v1") != null)).toBe(true);
  expect(puts).toHaveLength(0);

  // "close the app" while offline (a live old page would flush on 'online' itself), reopen online
  await page.goto("about:blank");
  up = true;
  await context.setOffline(false);
  await page.goto("/vocab");
  await expect.poll(() => puts.length, { timeout: 15_000 }).toBe(1);
  const keys = Object.keys(puts[0].learningStates as object);
  expect(keys).toContain("vocab:from-other-device");
  expect(keys.length).toBeGreaterThan(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jikari-pending-v1"))).toBeNull();
  expect(puts).toHaveLength(1);
});
