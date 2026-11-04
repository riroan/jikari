import { test, expect, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block", viewport: { width: 393, height: 852 } });

const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test("/review draws every due subject, answers update their boxes, no overflow at 393", async ({ page }) => {
  const states: Record<string, unknown> = {};
  let saved: Record<string, { lastReviewed: number }> = {};
  await page.route("**/api/progress", async (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({ json: { schemaVersion: 6, learningStates: states, heatmap: {}, currentStreak: 0 } });
    const body = r.request().postDataJSON();
    if (body?.learningStates) saved = body.learningStates;
    return r.fulfill({ json: { ok: true } });
  });
  await page.goto("/mistakes"); // any page: just to reach /api/cards
  const cards = await page.evaluate(async () => (await fetch("/api/cards")).json());

  const verbs = cards.vocab.filter((v: { verbGroup?: string }) => ["godan", "ichidan", "irregular"].includes(v.verbGroup ?? ""));
  const longestVerb = verbs.sort((a: { word: string; reading: string }, b: { word: string; reading: string }) =>
    (b.word + b.reading).length - (a.word + a.reading).length)[0];
  const adj = cards.vocab.find((v: { adjGroup?: string }) => v.adjGroup === "i_adj");
  const g = cards.grammar[0];
  const keys: string[] = [];
  const put = (mode: string, cardId: string, key = `${mode}:${cardId}`) => {
    keys.push(key);
    states[key] = { cardKey: key, mode, cardId, box: 2, nextDue: 1, correctStreak: 1, lastReviewed: 1 };
  };
  put("kanji", cards.kanji[0].id);
  put("vocab", cards.vocab.find((v: { verbGroup?: string; adjGroup?: string }) => v.verbGroup === "not_verb" && v.adjGroup === "not_adj").id);
  put("sentence", cards.sentences.find((s: { category: string }) => s.category !== "particle").id);
  put("sentence", cards.sentences.find((s: { category: string }) => s.category === "particle").id);
  put("conjugation", `${longestVerb.id}:basic`);
  put("conjugation", `${longestVerb.id}:conditional`); // 가장 긴 활용 프롬프트
  put("adjective", `${adj.id}:negative`);
  const gid = `${g.type === "pattern" ? "pattern" : "particle"}:${g.id}`;
  put("grammar", gid, `grammar:${gid}`);
  put("expression", cards.expressions[0].id);

  await page.goto("/review");
  const total = keys.length;
  await expect(page.getByText(new RegExp(`^1 / ${total} · `))).toBeVisible();

  const seen = new Set<string>();
  for (let i = 0; i < total; i++) {
    const label = await page.getByText(new RegExp(`^${i + 1} / ${total} · `)).innerText();
    seen.add(label.split("·")[1].trim().split(/\s/)[0]);
    expect(await noOverflow(page)).toBe(true);
    const box = page.getByRole("textbox");
    if (await box.isVisible().catch(() => false)) {
      await box.fill("x");
      await box.press("Enter");
    } else {
      await page.locator("div.flex.flex-col.gap-2 > button").first().click();
    }
    expect(await noOverflow(page)).toBe(true);
    await page.getByRole("button", { name: /^(다음 문제|次へ)$/ }).click();
  }
  expect([...seen].sort()).toEqual(["일상표현", "조사", "형용사", "동사활용", "문법", "문장", "단어", "한자"].sort());

  await expect.poll(() => keys.filter((k) => (saved[k]?.lastReviewed ?? 0) > 1000).length).toBe(total);
});
