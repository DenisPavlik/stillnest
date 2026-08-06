/**
 * The eye-check harness.
 *
 * This spec does not assert what a page looks like — taste is not testable and
 * pinned screenshots on a design that changes daily are pure friction. What it
 * does is guarantee two mechanical things at every breakpoint, and then leave a
 * screenshot behind for a human to judge:
 *
 *   1. the page renders at all
 *   2. the body never scrolls horizontally  <- the single most common responsive bug
 */

import { expect, test } from "@playwright/test";

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/directions/cold-instrument", name: "direction-cold-instrument" },
  { path: "/directions/editorial-wilderness", name: "direction-editorial-wilderness" },
  { path: "/directions/nocturne", name: "direction-nocturne" },
];

for (const route of ROUTES) {
  test(`${route.name} renders and never scrolls sideways`, async ({ page }, testInfo) => {
    const response = await page.goto(route.path);
    expect(response?.status(), `${route.path} should not error`).toBeLessThan(400);

    await page.waitForLoadState("networkidle");

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });

    // A 1px tolerance absorbs sub-pixel rounding at fractional device ratios.
    expect(
      overflow.scrollWidth,
      `horizontal overflow at ${testInfo.project.name}: content ${overflow.scrollWidth}px in a ${overflow.clientWidth}px viewport`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    await page.screenshot({
      path: `tests/__screenshots__/${route.name}--${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
}
