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
