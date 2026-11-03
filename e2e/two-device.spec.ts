import { test, expect } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

// /api/progress is fully mocked by a tiny server state machine (version tag + If-Match + 409): never touches the DB.
type State = Record<string, unknown> & { learningStates: Record<string, unknown> };
const ls = (id: string) => ({
  cardKey: `vocab:${id}`, mode: "vocab", cardId: id, box: 3, nextDue: 4102444800000, correctStreak: 2, lastReviewed: 1,
});
const base = (): State => ({
  schemaVersion: 6, learningStates: { "vocab:s0": ls("s0") }, heatmap: {}, lastActiveAt: 1, currentStreak: 0,
  quizStats: {}, ratings: {}, settings: { theme: "system", showFurigana: true, typingThresholdBox: 4, dailyGoal: 20 },
});

test("stale device gets 409 on PUT, merges, retries; final server state has both devices' answers", async ({ page }) => {
  let server = base();
  let version = 0;
  const log: string[] = [];
  const tag = () => `"v${version}"`;
  await page.route("**/api/progress", async (route) => {
    const req = route.request();
    if (req.method() === "PUT") {
      const ifMatch = req.headers()["if-match"];
      if (ifMatch && ifMatch !== tag()) {
        log.push("409");
        return route.fulfill({ status: 409, headers: { ETag: tag() }, json: server });
      }
      server = req.postDataJSON() as State;
      version++;
      log.push("200");
      return route.fulfill({ status: 200, headers: { ETag: tag() }, json: { ok: true } });
    }
    return route.fulfill({ headers: { ETag: tag() }, json: server });
  });

  // device A loads S0
  await page.goto("/vocab");
  const choice = page.locator("div.flex.flex-col.gap-2 > button").first();
  await page.getByRole("textbox").or(choice).waitFor();

  // device B (the phone) saves S1 to the server after A's GET
  server = { ...server, learningStates: { ...server.learningStates, "vocab:from-phone": ls("from-phone") } };
  version++;

  // device A (stale) answers one card
  const box = page.getByRole("textbox");
  if (await box.isVisible()) {
    await box.fill("x");
    await box.press("Enter");
  } else {
    await choice.click();
  }
  await page.getByRole("button", { name: "다음 문제" }).click();

  await expect.poll(() => log.includes("200"), { timeout: 15_000 }).toBe(true);
  expect(log[0]).toBe("409");
  const keys = Object.keys(server.learningStates);
  expect(keys).toContain("vocab:from-phone");
  expect(keys).toContain("vocab:s0");
  expect(keys.length).toBeGreaterThan(2); // + the card device A just answered
  await expect.poll(() => page.evaluate(() => localStorage.getItem("jikari-pending-v1"))).toBeNull();
});
