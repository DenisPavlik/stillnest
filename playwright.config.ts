import { defineConfig, devices } from "@playwright/test";

/**
 * Deliberately NOT port 3000, and deliberately NOT reusing an existing server.
 *
 * Port 3000 is whatever the developer happened to start last. Reusing it once meant a
 * whole screenshot run silently captured a different project's app — and the specs
 * still passed, because that app's auth middleware answered 200 on every route. Tests
 * that pass against the wrong application are worse than no tests.
 *
 * So: a dedicated port, and always our own server.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3311);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "mobile", use: { ...devices["iPhone 14"] } },
  ],

  /**
   * Runs against a production build, not `next dev`, for two reasons: Next refuses to
   * start a second dev server for the same directory (so a stale one breaks the run),
   * and the built output is what users actually get. Pages here are prerendered static,
   * so serving is instant — the build is the only cost.
   */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 300_000,
      },
});
