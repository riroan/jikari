import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 393, height: 852 } });

type Exp = { expression_jp: string; translation_ko: string };
const exps: Exp[] = [
  "expressions-batch1",
  "expressions-batch2",
  "expressions-numbers-batch1",
].flatMap((f) => JSON.parse(readFileSync(`data/seeds/${f}.json`, "utf8")) as Exp[]);

/** 가짜 인식기: start() 후 window.__sr 시나리오대로 이벤트를 쏜다. */
async function fakeRecognition(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__sr = { mode: "result", alts: [] };
    class Fake {
      lang = "";
      interimResults = true;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        const sr = w.__sr as { mode: string; alts: string[]; error?: string; delay?: number };
        w.__srConfig = { lang: this.lang, interim: this.interimResults, max: this.maxAlternatives };
        setTimeout(() => {
          if (sr.mode === "result") this.onresult?.({ results: [sr.alts.map((transcript) => ({ transcript }))] });
          else if (sr.mode === "error") this.onerror?.({ error: sr.error });
          this.onend?.();
        }, sr.delay ?? 100);
      }
      abort() {
        this.onend?.();
      }
    }
    // Chromium은 표준 SpeechRecognition이 이미 있어 앱이 그쪽을 먼저 쓴다 → 둘 다 덮는다.
    for (const k of ["SpeechRecognition", "webkitSpeechRecognition"])
      Object.defineProperty(window, k, { value: Fake, configurable: true });
  });
}

async function setSr(page: Page, sr: object) {
  await page.evaluate((v) => ((window as unknown as Record<string, unknown>).__sr = v), sr);
}

/** 현재 카드의 정답 표기. 짧은 카드는 close 시나리오(1글자 오차가 6자 이상에서만)가 안 돼 다시 뽑는다. */
async function openCard(page: Page, minLen = 0) {
  for (let i = 0; i < 30; i++) {
    await page.goto("/listening?kind=speaking");
    const meaning = await page.getByTestId("speak-meaning").innerText();
    const card = exps.find((e) => e.translation_ko === meaning);
    if (card && [...card.expression_jp.replace(/[、。？！\s]/g, "")].length >= minLen) return card;
  }
  throw new Error("no card");
}

const mic = (page: Page) => page.getByRole("button", { name: "말하기", exact: true });

test("speaking: exact -> reveals with furigana, recognizer config", async ({ page }) => {
  await fakeRecognition(page);
  const card = await openCard(page);
  await expect(page.getByRole("tab", { name: "말하기", selected: true })).toBeVisible();
  await setSr(page, { mode: "result", delay: 1500, alts: ["ぜんぜん違う", card.expression_jp] });
  await mic(page).click();
  await expect(page.getByText("듣고 있어요…")).toBeVisible();
  await expect(page.getByText("정확해요")).toBeVisible();
  await expect(page.locator("main ruby, main [lang=ja]").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "발음 듣기" })).toBeVisible();
  const cfg = await page.evaluate(() => (window as unknown as Record<string, unknown>).__srConfig);
  expect(cfg).toEqual({ lang: "ja-JP", interim: false, max: 3 });
});

test("speaking: close shows 거의 맞아요 + heard, then reveal", async ({ page }) => {
  await fakeRecognition(page);
  const card = await openCard(page, 6);
  await setSr(page, { mode: "result", alts: [card.expression_jp + "ん"] });
  await mic(page).click();
  await expect(page.getByText("거의 맞아요")).toBeVisible();
  await expect(page.getByText("들린 말:")).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 말하기" })).toBeVisible();
  await page.getByRole("button", { name: "이 정도면 OK" }).click();
  await expect(page.getByRole("button", { name: "다음 문제" })).toBeVisible();
});

test("speaking: miss -> retry -> show answer", async ({ page }) => {
  await fakeRecognition(page);
  await openCard(page);
  await setSr(page, { mode: "result", alts: ["ぬぬぬぬぬぬぬぬ"] });
  await mic(page).click();
  await expect(page.getByText("다시 말해 볼까요?")).toBeVisible();
  await page.getByRole("button", { name: "다시 말하기" }).click();
  await expect(page.getByText("다시 말해 볼까요?")).toBeVisible();
  await page.getByRole("button", { name: "정답 보기" }).click();
  await expect(page.getByRole("button", { name: "다음 문제" })).toBeVisible();
});

test("speaking: permission denied -> quiet message + self-check fallback", async ({ page }) => {
  await fakeRecognition(page);
  await openCard(page);
  await setSr(page, { mode: "error", error: "not-allowed" });
  await mic(page).click();
  await expect(page.getByText(/권한이 꺼져 있어요/)).toBeVisible();
  await page.getByRole("button", { name: "말했다고 표시" }).click();
  await expect(page.getByRole("button", { name: "다음 문제" })).toBeVisible();
});

test("speaking: skipping 10 cards ends in SessionSummary", async ({ page }) => {
  await fakeRecognition(page);
  await openCard(page);
  for (let i = 0; i < 10; i++) {
    await page.getByRole("button", { name: "건너뛰기" }).click();
    await page.getByRole("button", { name: "다음 문제" }).click();
  }
  await expect(page.getByRole("button", { name: "다음 문제" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "건너뛰기" })).toHaveCount(0);
});

test("speaking: unsupported browser still usable via self-check", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
  });
  await openCard(page);
  await expect(page.getByText(/음성 인식을 지원하지 않아요/)).toBeVisible();
  await expect(mic(page)).toHaveCount(0);
  await page.getByRole("button", { name: "말했다고 표시" }).click();
  await expect(page.getByRole("button", { name: "다음 문제" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
