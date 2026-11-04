import { test, expect, type Page } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });
test.setTimeout(90_000);

const MEMO = "연상: 내 메모 한 줄";

/** Deterministic deck: 6 vocab cards, one example sentence containing all of them (or none). */
async function setup(page: Page, withExample: boolean) {
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.route("**/api/cards", async (r) => {
    const res = await r.fetch();
    const j = await res.json();
    const vocab = j.vocab.filter((v: { word: string }) => /[一-鿿]/.test(v.word) && v.word.length >= 2).slice(0, 6);
    // Unique meaning per card so the test can tell which choice is right.
    for (const v of vocab) {
      v.koreanMeanings = [`OK-${v.word}`];
      delete v.ruby; // plain word in the question so its text is matchable
    }
    j.vocab = vocab;
    j.expressions = [];
    j.sentences = withExample
      ? [{
          ...j.sentences[0],
          id: "mc-test",
          category: "vocab",
          sentence: vocab.map((v: { word: string }) => v.word).join("、") + "＿＿＿",
          sentenceRuby: vocab.map((v: { word: string; reading: string }) => `{${v.word}|${v.reading}}`).join("、") + "＿＿＿",
          blank: "です",
          blankRuby: "です",
          distractors: ["a", "b", "c"],
          translation: "예문 번역 테스트",
        }]
      : [];
    j.vocabIds = vocab.map((v: { id: string }) => v.id);
    return r.fulfill({ json: j });
  });
  await page.goto("/vocab");
  await page.evaluate(async () => {
    const j = await (await fetch("/api/cards")).json();
    localStorage.clear();
    localStorage.setItem("jikari-memos-v1", JSON.stringify(j.vocabIds.map((id: string) => ({ key: `vocab:${id}`, text: "연상: 내 메모 한 줄", at: 1 }))));
  });
  await page.goto("/vocab");
}

const choices = (page: Page) => page.locator("div.flex.flex-col.gap-2 > button");

/** Answer the shown card right or wrong, deterministically (the right choice is `OK-<word>`). */
async function answer(page: Page, wantWrong: boolean) {
  await expect(choices(page)).toHaveCount(4);
  const words: string[] = await page.evaluate(async () => (await (await fetch("/api/cards")).json()).vocab.map((v: { word: string }) => v.word));
  const shown = await page.locator("div.text-\\[56px\\]").first().innerText();
  const word = words.filter((x) => shown.includes(x)).sort((a, b) => b.length - a.length)[0];
  const right = choices(page).filter({ hasText: `OK-${word}` });
  await (wantWrong ? choices(page).filter({ hasNotText: `OK-${word}` }).first() : right).click();
  await expect(page.getByText(wantWrong ? "不正解" : "正解", { exact: true })).toBeVisible();
}

for (const [w, h] of [[393, 852], [320, 640]] as const) {
  test.describe(`${w}px`, () => {
    test.use({ viewport: { width: w, height: h } });

    test("wrong + example + memo: furigana sentence, ko, speaker, memo below; next button does not move; no overflow", async ({ page }) => {
      await setup(page, true);
      await answer(page, true);
      const tail = page.getByTestId("quiz-tail");
      await expect(tail).toBeVisible();
      await expect(tail.getByText("예문 번역 테스트")).toBeVisible();
      await expect(tail.locator("ruby").first()).toBeVisible();
      await expect(tail.getByRole("button").first()).toBeVisible(); // SpeakButton
      await expect(tail.getByText(MEMO)).toHaveAttribute("lang", "ko");
      const next = page.getByRole("button", { name: "다음 문제" });
      const y0 = (await next.boundingBox())!.y;
      await page.waitForTimeout(500);
      expect((await next.boundingBox())!.y).toBe(y0);
      expect((await next.boundingBox())!.y + 44).toBeLessThanOrEqual(h);
      const tb = (await tail.boundingBox())!;
      expect(tb.y).toBeGreaterThan(y0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test("wrong without example: memo only, no example gap", async ({ page }) => {
      await setup(page, false);
      await answer(page, true);
      const tail = page.getByTestId("quiz-tail");
      await expect(tail.getByText(MEMO)).toBeVisible();
      await expect(tail.locator("ruby")).toHaveCount(0);
      expect((await tail.boundingBox())!.height).toBeLessThan(40);
    });

    test("correct: memo only, never the example", async ({ page }) => {
      await setup(page, true);
      await answer(page, false);
      await expect(page.getByTestId("quiz-tail").getByText(MEMO)).toBeVisible();
      await expect(page.getByText("예문 번역 테스트")).toHaveCount(0);
    });
  });
}
