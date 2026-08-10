/**
 * Reduced motion must remove the motion, not the content.
 *
 * This exists because the site got it wrong once, silently. `MotionProvider`
 * stamps `data-motion` onto <html> from a passive effect, but every `useGSAP`
 * runs in a *layout* effect — which React flushes first. On a cold load the flag
 * was not there yet, so a visitor who had explicitly asked for less motion got
 * the full set exactly once, on the one load that matters.
 *
 * Nothing about that failure is visible to a developer who does not have the
 * setting on. So it gets a test, and the test asserts the thing that actually
 * hurts: **content stuck invisible**. A reveal that never fires is content the
 * visitor never sees, and there is no error anywhere to find it by.
 */

import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/stays", "/stays/hollowmoss-04"];

for (const path of ROUTES) {
  test(`${path} stays fully legible with reduced motion`, async ({ page }, testInfo) => {
    // Emulated on the page rather than declared in the config: it must be in
    // force before the first script runs, which is exactly when the bug this
    // guards against happened.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const flag = await page.evaluate(() => document.documentElement.dataset.motion);
    expect(flag, "MotionProvider should mark the page as reduced").toBe("reduced");

    // Nothing anywhere may be left transparent or shifted off its place. Scoped
    // to elements that carry text, because that is what a visitor loses.
    const hidden = await page.evaluate(() => {
      const offenders: string[] = [];
      const nodes = document.querySelectorAll<HTMLElement>(
        "h1, h2, h3, p, li, figure, section, aside, article",
      );

      for (const el of nodes) {
        if (!el.textContent?.trim()) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        const transparent = Number(style.opacity) < 0.99;
        const moved =
          style.transform !== "none" && !/matrix\(1, 0, 0, 1, 0, 0\)/.test(style.transform);

        if (transparent || moved) {
          offenders.push(
            `${el.tagName.toLowerCase()}.${el.className || "-"} opacity=${style.opacity} transform=${style.transform}`,
          );
        }
      }
      return offenders;
    });

    expect(
      hidden,
      `content left animated-away under reduced motion:\n${hidden.join("\n")}`,
    ).toEqual([]);

    await page.screenshot({
      path: `tests/__screenshots__/reduced${path.replaceAll("/", "-")}--${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
}

test("scrolling is the browser's own, not hijacked", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Lenis animates the scroll position over ~1s. Native scrolling lands
  // immediately, so a single frame after the jump is enough to tell them apart.
  const landed = await page.evaluate(async () => {
    window.scrollTo(0, 800);
    await new Promise((r) => requestAnimationFrame(r));
    return window.scrollY;
  });

  expect(landed, "smooth scrolling should be off entirely").toBeGreaterThan(700);
});
