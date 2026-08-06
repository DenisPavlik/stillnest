/**
 * Guard: prove the suite is talking to THIS app.
 *
 * This exists because it already went wrong once. A screenshot run reused a dev server
 * on port 3000 that belonged to a different project, and every spec passed anyway —
 * that app's auth middleware answered 200 on every route, so the "does it render and
 * not overflow" checks were satisfied by a stranger's sign-in page.
 *
 * The config now uses a dedicated port and never reuses a server. This runs first and
 * fails loudly if that ever stops being true, so no other result can be trusted by
 * mistake.
 */

import { expect, test } from "@playwright/test";

test("the app under test is Stillnest", async ({ page }) => {
  const response = await page.goto("/directions");
  expect(response?.status(), "/directions should be served by this app").toBe(200);

  // A string that exists nowhere but in this repo.
  await expect(
    page.getByText("Stillnest · Phase 0 · visual directions"),
  ).toBeVisible();
});

test("unknown routes 404 — proof this is our router, not a catch-all", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist-in-stillnest");
  expect(
    response?.status(),
    "a foreign app with catch-all auth middleware would answer 200 here",
  ).toBe(404);
});
