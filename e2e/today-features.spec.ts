import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 393, height: 852 } });

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe("listening", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: { speak() {}, cancel() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {} },
      });
      (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = function () {};
    });
  });

  for (const [path, tab] of [["/listening", "단어"], ["/listening?kind=sentence", "문장"]] as const) {
    test(`${path} renders tab, play button, hides text until answered`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("tab", { name: tab, selected: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "듣기", exact: true })).toBeVisible();
      // Question area holds no Japanese text before answering (choices are Korean).
      await expect(page.getByText("들리는 말의 뜻은?")).toBeVisible();
      await expect(page.locator("main ruby, main [lang=ja]")).toHaveCount(0);

      await page.locator("div.flex.flex-col.gap-2 > button").first().click();
      await expect(page.getByRole("button", { name: "다음 문제" })).toBeVisible();
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test("listening dictation: type kana, see feedback with meaning", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: { speak() {}, cancel() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {} },
    });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = function () {};
  });
  await page.goto("/listening?kind=dictation");
  await expect(page.getByRole("tab", { name: "받아쓰기", selected: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "듣기", exact: true })).toBeVisible();
  await page.getByRole("textbox").fill("x");
  await page.getByRole("textbox").press("Enter");
  await expect(page.getByRole("button", { name: "다음 문제" })).toBeVisible();
  await expect(page.locator("main ruby, main [lang=ja]").first()).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

test("vocab quiz shows SessionSummary after 10 answers", async ({ page }) => {
  await page.goto("/vocab");
  const next = page.getByRole("button", { name: "다음 문제" });
  for (let i = 0; i < 10; i++) {
    // Cards alternate between typed and multiple-choice; any answer counts.
    const box = page.getByRole("textbox");
    const choice = page.locator("div.flex.flex-col.gap-2 > button").first();
    await box.or(choice).waitFor();
    if (await box.isVisible()) {
      await box.fill("x");
      await box.press("Enter");
    } else {
      await choice.click();
    }
    await next.click();
  }
  const summary = page.getByRole("region", { name: "세션 요약" });
  await expect(summary).toBeVisible();
  await expect(summary.getByText(/10문제 중 \d+개 정답/)).toBeVisible();
  await expect(summary.getByRole("link", { name: "홈으로" })).toBeVisible();
  await expect(summary.getByText(/오늘 \d+\/\d+ · 내일 예정 \d+장/)).toBeVisible();
  // Fits one 852px screen unless 6+ rows are missed (each ~52px; the list is the only variable part).
  if ((await summary.locator("li").count()) <= 5)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
  // 틀린 것만 다시 appears only when something was missed; otherwise 모두 맞혔어요.
  await expect(summary.getByRole("button", { name: "틀린 것만 다시" }).or(summary.getByText("모두 맞혔어요."))).toBeVisible();
});

test("search returns results without horizontal overflow", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("카드 검색").fill("ありがとう");
  await expect(page.getByText(/^\d+개$/)).toBeVisible();
  await expect(page.locator("main ul li").first()).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

test("progress shows FORECAST", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByText("FORECAST")).toBeVisible();
});

test("settings has 하루 목표 select", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("combobox", { name: "하루 목표" })).toBeVisible();
});

test("home has 오늘의 복습 CTA and single-line footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("오늘의 복습")).toBeVisible();
  const links = page.locator("nav").last().getByRole("link");
  const boxes = await links.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
  expect(boxes.length).toBeGreaterThan(1);
  expect(new Set(boxes.map((b) => Math.round(b.top))).size).toBe(1);
  expect(await noOverflow(page)).toBe(true);
});

test("progress shows BY SUBJECT mastery without overflow", async ({ page }) => {
  await page.goto("/progress");
  const sec = page.getByRole("region", { name: "BY SUBJECT" });
  await expect(sec).toBeVisible();
  await expect(sec.getByText("단어")).toBeVisible();
  await expect(sec.getByText(/학습 중 \d+ · 미학습 \d+/).first()).toBeVisible();
  expect(await noOverflow(page)).toBe(true);
});

// Gentle streak: home chip is "이번 주 N/7"; welcome-back line only after a 3+ day gap.
test.describe("gentle streak", () => {
  test.use({ serviceWorkers: "block" });
  const dayKey = (ago: number) => {
    const d = new Date();
    d.setDate(d.getDate() - ago);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const seed = async (page: Page, heatmapAgo: number[], withCards: boolean) => {
    const learningStates = withCards
      ? Object.fromEntries(
          Array.from({ length: 14 }, (_, i) => [`vocab:s${i}`, {
            cardKey: `vocab:s${i}`, mode: "vocab", cardId: `s${i}`, box: 1, nextDue: 1, correctStreak: 0, lastReviewed: 1,
          }]),
        )
      : {};
    const heatmap = Object.fromEntries(heatmapAgo.map((a) => [dayKey(a), 3]));
    const state = {
      schemaVersion: 6, learningStates, heatmap, lastActiveAt: 1, currentStreak: 0, quizStats: {}, ratings: {},
      settings: { theme: "system", showFurigana: true, typingThresholdBox: 4, dailyGoal: 20 },
    };
    await page.route("**/api/progress", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ status: 200, headers: { ETag: '"v1"' }, json: state })
        : route.fulfill({ status: 200, headers: { ETag: '"v2"' }, json: state }),
    );
  };

  for (const width of [393, 320]) {
    test(`gap of 5 days shows the quiet line, header stays on one row @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 852 });
      await seed(page, [5, 6, 9], true);
      await page.goto("/");
      await expect(page.getByText("이번 주 2/7")).toBeVisible();
      const line = page.getByRole("link", { name: "오랜만이에요. 오늘은 10장만 해도 충분해요" });
      await expect(line).toHaveAttribute("href", "/review");
      // chip and quiet line each stay on a single line (no wrap)
      const lh = (loc: ReturnType<Page["locator"]>) => loc.evaluate((el) => el.getBoundingClientRect().height);
      expect(await lh(page.getByText("이번 주 2/7"))).toBeLessThan(24);
      expect(await lh(line)).toBeLessThan(48);
      expect(await noOverflow(page)).toBe(true);
    });
  }

  test("no line after a 2-day gap, on first run, or when nothing is due", async ({ page }) => {
    await seed(page, [2, 3], true);
    await page.goto("/");
    await expect(page.getByText("이번 주 2/7")).toBeVisible();
    await expect(page.getByText(/오랜만이에요/)).toHaveCount(0);
    await page.unrouteAll();
    await seed(page, [9], false);
    await page.goto("/");
    await expect(page.getByText("이번 주 0/7")).toBeVisible();
    await expect(page.getByText(/오랜만이에요/)).toHaveCount(0);
  });
});
