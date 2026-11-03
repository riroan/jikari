import { test, expect } from "@playwright/test";

// Prod builds: the SW answers /api/progress itself, so page.route mocks would never fire.
test.use({ serviceWorkers: "block" });

test("힌트: 단계별 공개, 쓰면 정답이어도 승급 없음", async ({ page }) => {
  const puts: string[] = [];
  await page.route("**/api/progress", (r) => {
    if (r.request().method() === "GET")
      return r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } });
    puts.push(r.request().postData() ?? "");
    return r.fulfill({ json: { ok: true } });
  });
  // Same card on both visits.
  await page.addInitScript(() => {
    // Deterministic but not constant (a constant breaks libs that retry until unique).
    let t = 42;
    Math.random = () => {
      t = (t + 0x6d2b79f5) | 0;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  });
  const input = page.getByRole("textbox", { name: "活用形 입력" });
  const hint = page.getByRole("button", { name: "힌트", exact: true });

  // Visit 1: miss on purpose to learn the answer.
  await page.goto("/conjugation");
  await expect(input).toBeFocused(); // autofocus runs after hydration
  await expect(async () => {
    await input.fill("");
    await input.pressSequentially("a");
    await expect(input).toHaveValue("あ", { timeout: 500 }); // romaji->kana means hydrated
  }).toPass();
  await input.press("Enter");
  const big = page.locator("div.text-\\[32px\\]");
  const shown = [
    (await big.first().textContent())!,
    ...((await big.locator("xpath=following-sibling::div[1]").textContent()) ?? "").split(" · "),
  ].map((x) => x.trim());
  const answer = shown.find((x) => /^[ぁ-ゟー]+$/.test(x))!; // the kana form the hint is built from
  expect(answer.length).toBeGreaterThan(1);

  // Visit 2: fresh state, same card.
  await page.evaluate(() => localStorage.clear());
  puts.length = 0;
  await page.goto("/conjugation");
  await expect(input).toBeFocused();
  await hint.click();
  const live = page.locator("[aria-live=polite]").filter({ hasText: "＿" });
  const chars = Array.from(answer);
  await expect(live).toHaveText(chars[0] + "＿".repeat(chars.length - 1));
  await expect(input).toBeFocused();
  await hint.click();
  await expect(hint).toBeDisabled();
  await expect(input).toBeFocused();

  await input.pressSequentially(answer);
  await input.press("Enter");
  await expect(page.getByText("힌트를 썼어요 — 다시 도전할 카드로 남겨둘게요")).toBeVisible();
  await page.getByRole("button", { name: "次へ" }).click();
  await expect.poll(() => puts.length).toBeGreaterThan(0);
  const body = puts.join("");
  expect(body).toContain('"box":1');
  expect(body).not.toContain('"box":2');
});

test("힌트: 4지선다에는 없다", async ({ page }) => {
  await page.route("**/api/progress", (r) =>
    r.request().method() === "GET"
      ? r.fulfill({ json: { schemaVersion: 6, learningStates: {}, heatmap: {}, currentStreak: 0 } })
      : r.fulfill({ json: { ok: true } }),
  );
  await page.goto("/vocab");
  await expect(page.getByRole("button").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "힌트", exact: true })).toHaveCount(0);
});
