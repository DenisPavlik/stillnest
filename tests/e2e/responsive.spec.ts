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
  /* The only page made entirely of sentences. Its risk is the opposite of the
     catalog's: no grid to blow out, but a two-column refusals block and a
     two-column readings table that both have to collapse cleanly, and long
     unbreakable prose lines are the classic way a phone gains 40px of width. */
  { path: "/philosophy", name: "philosophy" },
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
  /* A sentence. The grid comes back in an order no ORDER BY produced, and the
     field holding the sentence is the largest type on the page — the two things
     most likely to push a phone sideways. Whether the Python service is up
     decides which state this photographs, and BOTH are states the page has to
     hold: ranked by meaning, or the ordinary catalog with search declared down.
     Neither is allowed to overflow. */
  {
    path: "/stays?q=alone+by+a+lake%2C+snow%2C+no+signal",
    name: "stays-search",
  },
  /* A sentence that survives the search and is then refused by the console —
     the empty state has to name which of the two did the excluding, and offer
     a way out of each. */
  { path: "/stays?q=deep+snow&km=80&signal=none", name: "stays-search-empty" },
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

    /**
     * Walk the whole page down and back up before measuring anything.
     *
     * Two reasons, and both of them are the motion layer.
     *
     * Scrubbed timelines only apply their transforms *while* you are scrolling
     * past them, so measuring at the top of the page measures the one state in
     * which nothing has moved — which is precisely the state that cannot break.
     * The widest the document ever gets is somewhere in the middle of the
     * scroll, so that is where the guard has to look. This returns the worst
     * width seen anywhere on the way down.
     *
     * And reveals are scroll-triggered: below the fold they are sitting at
     * opacity 0 waiting for a trigger that a `fullPage` screenshot will never
     * fire, because Chromium captures beyond the viewport instead of scrolling.
     * Without the walk, every section under the hero photographs blank.
     */
    const worst = await page.evaluate(async () => {
      const doc = document.documentElement;
      const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60)));
      let scrollWidth = doc.scrollWidth;

      const measure = () => {
        scrollWidth = Math.max(scrollWidth, doc.scrollWidth);
      };

      const step = Math.round(window.innerHeight * 0.6);
      for (let y = 0; y < doc.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await frame();
        measure();
      }

      window.scrollTo(0, doc.scrollHeight);
      await frame();
      measure();

      // Back to the top, and give the scrubbed hero time to unwind before the
      // shutter opens — a screenshot of a half-faded hero is not a design.
      window.scrollTo(0, 0);
      await frame();
      await frame();
      await frame();

      return { scrollWidth, clientWidth: doc.clientWidth };
    });

    // A 1px tolerance absorbs sub-pixel rounding at fractional device ratios.
    expect(
      worst.scrollWidth,
      `horizontal overflow at ${testInfo.project.name}: content ${worst.scrollWidth}px in a ${worst.clientWidth}px viewport`,
    ).toBeLessThanOrEqual(worst.clientWidth + 1);

    await page.screenshot({
      path: `tests/__screenshots__/${route.name}--${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
}
