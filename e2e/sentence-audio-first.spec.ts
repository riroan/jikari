import { test, expect, type Page } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block", viewport: { width: 393, height: 852 } });

async function setup(page: Page, opts: { pref?: "on"; voice: boolean }) {
  const { sentences } = await (await page.request.get("/api/cards")).json();
  const states = Object.fromEntries(
    (sentences as { id: string }[]).map(({ id }) => [
      `sentence:${id}`,
      { cardKey: `sentence:${id}`, mode: "sentence", cardId: id, box: 4, nextDue: 0, correctStreak: 3, lastReviewed: 1 },
    ]),
  );
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: states, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.addInitScript(
    ({ pref, voice }) => {
      const w = window as unknown as { __spoken: string[]; SpeechSynthesisUtterance: unknown };
      w.__spoken = [];
      if (pref) localStorage.setItem("jikari-sentence-audio-first", pref);
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          speaking: false,
          pending: false,
          speak: (u: { text: string }) => w.__spoken.push(u.text),
          cancel() {},
          getVoices: () => (voice ? [{ lang: "ja-JP" }] : []),
          addEventListener() {},
          removeEventListener() {},
        },
      });
      w.SpeechSynthesisUtterance = class {
        rate = 1;
        lang = "";
        constructor(public text: string) {}
      };
    },
    opts,
  );
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
const choices = (page: Page) => page.locator("div.flex.flex-col.gap-2:not([data-testid]) > button");

test("default (pref off): sentence text shown, no audio-first, even at box 4", async ({ page }) => {
  await setup(page, { voice: true });
  await page.goto("/sentence");
  await expect(choices(page)).toHaveCount(4);
  await expect(page.getByTestId("audio-first")).toHaveCount(0);
  await expect(page.getByText("＿＿＿").first()).toBeVisible();
});

test("on: audio first, no auto-speak, speaker + 느리게 speak, 문장 보기 reveals", async ({ page }) => {
  await setup(page, { pref: "on", voice: true });
  await page.goto("/sentence");
  await expect(page.getByTestId("audio-first")).toBeVisible();
  await expect(page.getByText("＿＿＿")).toHaveCount(0);
  expect(await spoken(page)).toEqual([]);
  const box = await page.getByRole("button", { name: "문장 듣기" }).boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  await page.getByRole("button", { name: "문장 듣기" }).click();
  await page.getByRole("button", { name: "천천히 듣기" }).click();
  expect((await spoken(page)).length).toBe(2);
  await expect(choices(page)).toHaveCount(4);
  await page.getByRole("button", { name: "문장 보기" }).click();
  await expect(page.getByText("＿＿＿").first()).toBeVisible();
  await expect(page.getByTestId("audio-first")).toHaveCount(0);
});

test("on but no ja-JP voice: falls back to text", async ({ page }) => {
  await setup(page, { pref: "on", voice: false });
  await page.goto("/sentence");
  await expect(page.getByText("＿＿＿").first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("audio-first")).toHaveCount(0);
});
