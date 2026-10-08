"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/** The live Lenis instance, while there is one. Module scope, because a scroll
    request ("take me to the room") comes from a component nowhere near this one. */
let active: Lenis | null = null;

/**
 * Scroll to an element by id the way the rest of the site scrolls: through Lenis
 * when it is running, so the move settles with the same curve as the wheel does,
 * and natively otherwise. Reduced motion jumps, because a long animated scroll is
 * exactly the motion that setting asks to be spared.
 */
export function scrollToId(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  // Layout position, not the painted one: a <Reveal> target is still sitting
  // a few pixels low under its entrance transform when the scroll starts, and
  // measuring that would overshoot by exactly the reveal distance.
  let y = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
    y += n.offsetTop;
  }
  scrollToY(y);
}

/** Scroll to a page offset — Lenis when it runs, native otherwise. */
export function scrollToY(y: number): void {
  if (active) {
    active.scrollTo(y, { duration: 1.8 });
    return;
  }
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
}

/**
 * Smooth scrolling, and the one place ScrollTrigger is driven from.
 *
 * Lenis takes over the scroll position, so ScrollTrigger has to be told to read
 * from it instead of from the browser — otherwise every pinned section and every
 * scrubbed timeline is measured against a scroll position that is no longer the
 * real one, and everything lands slightly late.
 *
 * Mounted once in the root layout. Renders nothing.
 *
 * **prefers-reduced-motion turns the whole thing off**, rather than merely
 * shortening it: hijacked scrolling is itself the problem for someone who asked
 * for less motion, so the browser keeps its native scroll and ScrollTrigger
 * falls back to reading the window.
 */
export function MotionProvider() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      document.documentElement.dataset.motion = "reduced";
      return;
    }

    document.documentElement.dataset.motion = "full";

    // On iOS the address bar collapses as you scroll, which resizes the viewport
    // by ~60px and makes ScrollTrigger refresh mid-gesture — every scrubbed
    // timeline on the page jumps at exactly the moment you start reading. This
    // tells it to ignore small height-only changes on touch devices.
    ScrollTrigger.config({ ignoreMobileResize: true });

    const lenis = new Lenis({
      duration: 1.05,
      // A gentle exponential out. The site is about stillness; scrolling should
      // settle rather than glide on forever.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Touch devices keep their native scroll — momentum is already good there,
      // and overriding it is the fastest way to make a phone feel broken.
      smoothWheel: true,
      syncTouch: false,
    });

    active = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Fonts land after first paint and change every measurement on the page.
    // Without this, triggers computed against fallback metrics fire at the
    // wrong scroll position — subtly, and only on a cold load.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      active = null;
      delete document.documentElement.dataset.motion;
    };
  }, []);

  return null;
}
