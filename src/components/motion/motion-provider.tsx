"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
      delete document.documentElement.dataset.motion;
    };
  }, []);

  return null;
}
