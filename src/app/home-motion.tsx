"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { prefersReducedMotion } from "@/components/motion/prefers-reduced";

import s from "./home.module.css";

/* ==================================================================== *
 *  NOISE → SILENCE
 *
 *  The one choreographed moment on the site, and the thing the whole
 *  project is named for. It is a single sentence in three clauses:
 *
 *    1. THE HERO SETTLES.  The camera stops walking, the tagline lands,
 *       and the reach line measures itself out to 34 km. Nothing else
 *       happens for as long as you stand still.
 *
 *    2. THE PICTURE LEAVES.  On the first scroll the depths come apart —
 *       the far ridge barely moves, the near trunks sink, the fog lifts
 *       off the water — while the film grain thins out and the whole
 *       frame dims to the page's own black. The noise drains out of the
 *       image rather than being cut off.
 *
 *    3. IT STOPS.  A hairline draws across the seam, the fog loop is
 *       paused the instant the hero is gone, and the Solitude Index
 *       arrives into a page on which literally nothing is moving. The
 *       instruments then report in one at a time.
 *
 *  Everything else on this page is `<Reveal>`. If a fourth idea ever
 *  wants to live here, it belongs somewhere else.
 * ==================================================================== */

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * How far each plane of the hero lags behind the frame it is leaving, in
 * SVG user units, across the whole departure. Positive is down the screen.
 *
 * Nearer planes lag more, which is what depth looks like. Every number is
 * inside the overdraw its plane was drawn with, so no layer can slide far
 * enough to show its own edge — see the note in `forest-scene.tsx`.
 */
const LAG: Readonly<Record<string, number>> = {
  far: 9,
  mid: 20,
  house: 18,
  fog: -12, // fog lifts off the water rather than sinking with the trees
  near: 34,
  fore: 14,
  bough: -8, // anchored above the frame: may only ever travel up
  mirror: 24, // inside the water flip, +y is up the screen
};

/** Where the picture ends up: the page's own black, not a grey wash. */
const DIM = 0.82;
/** The grain at rest, and the grain once the noise has gone. */
const GRAIN_QUIET = 0.07;

export interface HeroDepartureProps {
  className?: string;
  id?: string;
  children: ReactNode;
}

/**
 * The hero, plus the two beats attached to it: the settle on arrival and
 * the departure on scroll.
 *
 * It is a client component that renders a plain `<header>` around
 * server-rendered children, so the page above it stays a server component
 * and only the choreography ships as JavaScript.
 *
 * **The hero is a media slot**, and this survives it changing. The layered
 * parallax runs only if it finds `[data-depth]` planes inside the slot;
 * when a photograph or a video loop lands there in Phase 9 there will be
 * none, and the slot drifts and dollies as one piece instead. Every other
 * beat — the dim, the grain, the copy, the fog — is media-agnostic already.
 */
export function HeroDeparture({ className, id, children }: HeroDepartureProps): ReactNode {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      if (prefersReducedMotion()) return;

      const q = gsap.utils.selector(root);
      const slot = root.querySelector<HTMLElement>("[data-hero-slot]");
      const media = slot?.firstElementChild as HTMLElement | null;
      const dim = root.querySelector<HTMLElement>("[data-hero-dim]");
      const copy = root.querySelector<HTMLElement>("[data-hero-copy]");
      const grain = document.querySelector<HTMLElement>("[data-grain]");
      const fog = root.querySelector<SVGGElement>("[data-fog-drift]");
      const layers = q("[data-depth]");

      /* ---------------- 1. the hero settles ---------------- *
         Sequenced by hand rather than through <Reveal>: this is the one
         place on the site where the order of arrival carries meaning, and
         the reach line has to finish last. Nothing starts hidden in CSS —
         these are `.from()` tweens, so with no JavaScript it is all just
         there. */
      const intro = gsap.timeline({ defaults: { ease: "power2.out", duration: 1.1 } });

      intro
        .from(q("nav"), { opacity: 0, duration: 1.3 }, 0)
        .from(q("[data-hero-tagline] span"), { opacity: 0, y: 26, duration: 1.4, stagger: 0.16 }, 0.1)
        .from(q("[data-hero-lede]"), { opacity: 0, y: 14 }, 0.8)
        /* The measurement extends to its reading. Widening the rule takes
           the kilometre ticks and the far end point with it, so the far
           door really does travel out to 34 km — the only thing on the
           page you are meant to watch happen. */
        .from(
          q("[data-hero-reach] [data-reach-rule]"),
          { width: 0, duration: 1.8, ease: "power2.inOut", clearProps: "width" },
          1.0,
        )
        .from(
          q("[data-hero-reach] [data-reach-value], [data-hero-reach] [data-reach-ends]"),
          { opacity: 0, duration: 1.0 },
          1.15,
        )
        .from(q("[data-hero-where]"), { opacity: 0, y: 10 }, 1.6);

      /* The camera stops walking: the picture comes to rest over three and a
         half seconds, which is slow enough that you register it as the scene
         settling rather than as an animation.

         On the slot, not on the media element — the departure owns that one,
         and two tweens on one transform fight. Checked here rather than inside
         matchMedia so that dragging a window across 768px does not re-run an
         arrival that already happened. Left off small screens: it is a scaled
         repaint of a filtered SVG on hardware that cannot spare one. */
      if (slot && window.matchMedia("(min-width: 768px)").matches) {
        intro.from(slot, { scale: 1.045, duration: 3.4, ease: "power2.out" }, 0);
      }

      /* ---------------- 2 & 3. the picture leaves ---------------- */
      const mm = gsap.matchMedia();

      /** Once the hero is gone, so is the last moving thing on the page. */
      const fogRunning = (on: boolean) => {
        if (fog) fog.style.animationPlayState = on ? "running" : "paused";
      };

      const departure = () =>
        gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom top",
            // Not pinned, deliberately. Pinning the hero buys a longer moment
            // and costs a fight with the iOS address bar and a layout the
            // overflow guard has to be talked out of. The hero simply leaves.
            scrub: 0.5,
            invalidateOnRefresh: true,
            onLeave: () => fogRunning(false),
            onEnterBack: () => fogRunning(true),
          },
        });

      mm.add("(min-width: 768px)", () => {
        const tl = departure();

        tl.to(dim, { opacity: DIM }, 0)
          .to(grain, { opacity: GRAIN_QUIET, duration: 0.8 }, 0)
          // Starts late and ends just as the line clears the top of the
          // screen. Faded any earlier and the tagline is a ghost while it is
          // still sitting in the middle of the page, which reads as a bug.
          .to(copy, { opacity: 0, y: -46, duration: 0.74 }, 0.19);

        if (layers.length) {
          /* Layered path: the depths come apart. */
          tl.to(media, { scale: 1.04 }, 0);
          for (const layer of layers) {
            const y = LAG[(layer as HTMLElement).dataset.depth ?? ""];
            if (y) tl.to(layer, { y }, 0);
          }
        } else if (media) {
          /* Flat path — a photograph or a video loop. One plane, so it gets
             the plain full-bleed lag instead.

             The two numbers are not free: scaling to 1.10 puts 5% of spare
             image above and below the crop, and the drift spends 3.5% of it.
             Both are linear against the same progress, so the margin leads the
             travel at every point of the scroll and no edge can ever come into
             shot. Raise the drift and you must raise the scale with it. */
          tl.to(media, { scale: 1.1, yPercent: 3.5 }, 0);
        }
      });

      mm.add("(max-width: 767.98px)", () => {
        /* A phone gets the same sentence with fewer words. Eight filtered
           SVG planes moving independently is a repaint per frame on hardware
           that cannot spare one, and the depth it buys is invisible at 375px
           anyway. The grain and the dim carry the whole idea, and both are
           single composited properties. */
        departure()
          .to(dim, { opacity: 0.8 }, 0)
          .to(grain, { opacity: GRAIN_QUIET, duration: 0.8 }, 0)
          .to(copy, { opacity: 0, y: -24, duration: 0.74 }, 0.19);
      });

      return () => {
        mm.revert();
        fogRunning(true);
      };
    },
    { scope },
  );

  return (
    <header ref={scope} className={className} id={id}>
      {children}
      {/* The picture dims into the page's own ground colour as it leaves, so
          the photograph does not end — it dissolves into the section under
          it. Starts fully transparent, so it hides nothing without JS. */}
      <div className={s.dim} data-hero-dim aria-hidden="true" />
    </header>
  );
}

/**
 * The seam. One hairline drawn across the top of the Solitude Index at the
 * moment the picture has gone quiet — the same measured rule the reach line
 * is made of, saying that from here on the page is instruments.
 *
 * Purely decorative, so it is `aria-hidden` and carries no text.
 */
export function Threshold(): ReactNode {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      gsap.from(scope.current, {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.7,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: scope.current,
          // Late on purpose. At 62% the hero is half gone and already dimming,
          // so the line lands as the last beat of the departure rather than
          // as the first thing you notice about the section below.
          start: "top 62%",
          once: true,
        },
      });
    },
    { scope },
  );

  return <div ref={scope} className={s.threshold} aria-hidden="true" />;
}
