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

/* Phase 0 is over — the exploration routes are gone and the chosen direction
   IS the home page. Add each real route here as its phase lands. */
const ROUTES = [
  { path: "/", name: "home" },
  { path: "/stays", name: "stays" },
  /* The console at full deflection: every control engaged, so the widest state
     of each one is measured — and a filtered view is proven to survive a cold
     load from nothing but its URL. */
  {
    path: "/stays?biome=forest&km=30&db=32&sky=2&signal=none&sleeps=4&sort=price",
    name: "stays-filtered",
  },
  /* Nothing matches this: the only house 80 km out has a weak signal. The
     empty state has to hold the page up too, and name the reading that did
     the excluding. */
  { path: "/stays?km=80&signal=none", name: "stays-empty" },
  /* Two detail pages, not one: the hero scene, the instruments and the copy are
     all generated from the stay's own readings, so a desert house at Bortle 1
     exercises different code from a forest house at Bortle 2. */
  { path: "/stays/hollowmoss-04", name: "stay-forest" },
  { path: "/stays/meridian-05", name: "stay-desert" },
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
