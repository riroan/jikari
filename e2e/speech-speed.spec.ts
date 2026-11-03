import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 393, height: 852 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __rates: number[]; SpeechSynthesisUtterance: unknown };
    w.__rates = [];
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false,
        pending: false,
        speak(u: { rate: number }) {
          w.__rates.push(u.rate);
        },
        cancel() {},
        getVoices: () => [],
        addEventListener() {},
        removeEventListener() {},
      },
    });
    w.SpeechSynthesisUtterance = class {
      rate = 1;
      lang = "";
      constructor(public text: string) {}
    };
  });
});

const rates = (page: import("@playwright/test").Page) =>
  page.evaluate(() => (window as unknown as { __rates: number[] }).__rates);

test("speed pref applies to utterance rate; 천천히 is slower still", async ({ page }) => {
  await page.goto("/listening");
  await page.getByRole("button", { name: "듣기", exact: true }).click();
  expect((await rates(page)).at(-1)).toBe(0.9);

  await page.goto("/settings");
  await page.getByLabel("발음 속도").selectOption("slow");
  expect((await rates(page)).at(-1)).toBe(0.7); // preview utterance

  await page.goto("/listening");
  await page.getByRole("button", { name: "듣기", exact: true }).click();
  expect((await rates(page)).at(-1)).toBe(0.7);
  await page.getByRole("button", { name: "천천히", exact: true }).click();
  expect((await rates(page)).at(-1)).toBe(0.6);
});
