import { test, expect, type Page } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block", viewport: { width: 393, height: 852 } });

type Saved = Record<string, { box: number; nextDue: number; lastReviewed: number }>;
const T0 = new Date("2026-06-01T09:00:00Z").getTime();
const DAY = 86_400_000;

/** Answer the first vocab card correctly after `waitMs` of (fake) thinking. */
async function answerCorrect(page: Page, waitMs: number, hide = false) {
  let saved: Saved = {};
  await page.route("**/api/progress", (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } });
    const body = r.request().postDataJSON();
    if (body?.learningStates) saved = body.learningStates;
    return r.fulfill({ json: { ok: true } });
  });
  await page.addInitScript(() => {
    let t = 42; // same card + same choice order on every load
    Math.random = () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  });
  const choices = page.locator("div.flex.flex-col.gap-2 > button");
  for (let i = 0; i < 4; i++) {
    saved = {};
    await page.clock.install({ time: T0 });
    await page.goto("/vocab");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/vocab");
    await expect(choices).toHaveCount(4);
    await page.clock.fastForward(waitMs);
    if (hide) {
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "hidden", { value: false, configurable: true });
      });
    }
    await choices.nth(i).click();
    if (await page.getByText("正解", { exact: true }).isVisible()) {
      await page.getByRole("button", { name: "다음 문제" }).click();
      await expect.poll(() => Object.keys(saved).length).toBeGreaterThan(0);
      return { state: Object.values(saved)[0] };
    }
  }
  throw new Error("no correct choice found");
}

test("빠른 정답은 승급한다 (box 1 → 2)", async ({ page }) => {
  const { state } = await answerCorrect(page, 2_000);
  expect(state.box).toBe(2);
});

test("느린 정답(12초)은 박스 유지, 내일 다시, 안내 한 줄", async ({ page }) => {
  const { state } = await answerCorrect(page, 12_000);
  expect(state.box).toBe(1);
  expect(state.nextDue - state.lastReviewed).toBe(DAY);
});

test("60초 넘게 걸리면 모름으로 보고 정상 승급", async ({ page }) => {
  const { state } = await answerCorrect(page, 90_000);
  expect(state.box).toBe(2);
});

test("질문 중 화면이 숨겨졌다 돌아오면 느려도 정상 승급", async ({ page }) => {
  const { state } = await answerCorrect(page, 12_000, true);
  expect(state.box).toBe(2);
});

test("느림 안내는 정답 뒤에만 보이고 레이아웃을 밀지 않는다", async ({ page }) => {
  // answerCorrect clicks 다음 at the end; re-run the slow path and inspect before it.
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.addInitScript(() => {
    let t = 42;
    Math.random = () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  });
  const choices = page.locator("div.flex.flex-col.gap-2 > button");
  for (let i = 0; i < 4; i++) {
    await page.clock.install({ time: T0 });
    await page.goto("/vocab");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/vocab");
    await expect(choices).toHaveCount(4);
    const firstTop = await choices.first().boundingBox();
    await page.clock.fastForward(12_000);
    await choices.nth(i).click();
    if (await page.getByText("正解", { exact: true }).isVisible()) {
      await expect(page.getByText("느렸어요 · 한 번 더 볼게요")).toBeVisible();
      expect((await choices.first().boundingBox())!.y).toBe(firstTop!.y);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      return;
    }
  }
  throw new Error("no correct choice found");
});
