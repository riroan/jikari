import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — minimal smoke suite for jikari.
 *
 * Goals:
 * - Verify each route renders its shell without JS errors.
 * - Run on Chromium only (personal app, faster cycle).
 * - Reuse the dev server locally; start fresh on CI.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3333",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "bun dev",
    url: "http://localhost:3333",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
