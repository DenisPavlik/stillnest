"use client";

import { useEffect, useRef, useState } from "react";

import { scrollToY } from "@/components/motion/motion-provider";

import s from "./back-to-top.module.css";

/** Circumference of the ring, r = 27 in a 58 viewBox. */
const RING = 2 * Math.PI * 27;

/**
 * The way back up. The header is not fixed — it belongs to the hero, and a bar
 * that follows you down a page about stillness would be the one thing on it
 * that will not sit still — so after the first screen this is the only route
 * back to the navigation short of scrolling the whole page.
 *
 * It appears once the hero is behind you and not before: on the first screen
 * there is nowhere to go back to. The ring fills with ember as you go down, so
 * the control also says how far into the page you are — an instrument, like
 * everything else here, rather than a bare arrow.
 */
export function BackToTop() {
  const [shown, setShown] = useState(false);
  const fill = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const onScroll = () => {
      setShown(window.scrollY > window.innerHeight);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      // Straight onto the node: this runs on every scroll frame, and a React
      // render per frame for one stroke offset is all cost and no benefit.
      fill.current?.style.setProperty("stroke-dashoffset", String(RING * (1 - p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <button
      type="button"
      className={s.top}
      data-shown={shown ? "" : undefined}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      onClick={() => scrollToY(0)}
    >
      <svg className={s.ring} viewBox="0 0 58 58" aria-hidden="true">
        <circle className={s.track} cx="29" cy="29" r="27" />
        <circle
          ref={fill}
          className={s.fill}
          cx="29"
          cy="29"
          r="27"
          strokeDasharray={RING}
          strokeDashoffset={RING}
        />
      </svg>
      <span className={s.arrow} aria-hidden="true">
        ↑
      </span>
    </button>
  );
}
