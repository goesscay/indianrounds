import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end and accessibility checks against a running stack (API + web).
 * Locally: start both (see README, "Run locally"), seed with `php artisan migrate:fresh --seed`, then `pnpm e2e`.
 * CI does the same in the "e2e" job. The API must run with PAYMENT_DRIVER=fake so payments can be simulated.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
