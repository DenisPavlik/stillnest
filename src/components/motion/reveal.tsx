"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import { prefersReducedMotion } from "./prefers-reduced";

/**
 * The one reveal primitive. Everything that appears on scroll goes through it,
 * so the site has a single rhythm rather than a dozen slightly different fades.
 *
 * Deliberately restrained: a short rise and a fade, once, and never again. No
 * reverse on scroll-up — content that re-hides when you scroll back is a
 * distraction on a page about being calm, and it makes re-reading annoying.
 *
 * **Nothing is hidden by CSS.** The starting state is applied by GSAP in an
 * effect, so if JavaScript never runs the content is simply visible. A reveal
 * that hides content up front is a reveal that can permanently hide content.
 */

type RevealProps = {
  children: ReactNode;
  /** Seconds to wait after the trigger fires. Use for deliberate sequencing. */
  delay?: number;
  /** Distance travelled, in px. Keep it small — this is a lift, not a slide. */
  distance?: number;
  /** Stagger direct children instead of animating the wrapper as one block. */
  stagger?: number;
  /**
   * Stagger these descendants instead of the direct children. For content that
   * arrives already wrapped — a server component's own rows, say — where the
   * page cannot put a `<Reveal>` around each one. Pair it with `stagger`.
   */
  select?: string;
  as?: ElementType;
  className?: string;
  /** For an in-page link or a scroll target to land on. */
  id?: string;
};

export function Reveal({
  children,
  delay = 0,
  distance = 18,
  stagger,
  select,
  as: Tag = "div",
  className,
  id,
}: RevealProps) {
  const scope = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = scope.current;
      if (!el) return;
      if (prefersReducedMotion()) return;
      /* Phones get the content, not the entrance. With iOS momentum scrolling
         the trigger fires late, and a fast flick landed on sections still at
         opacity 0 — the owner recorded it as "blocks that take ages to draw". */
      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;

      const targets: gsap.TweenTarget = select
        ? Array.from(el.querySelectorAll(select))
        : stagger
          ? Array.from(el.children)
          : el;
      if (Array.isArray(targets) && targets.length === 0) return;

      gsap.from(targets, {
        opacity: 0,
        y: distance,
        duration: 0.9,
        delay,
        ease: "power2.out",
        stagger: stagger ?? 0,
        scrollTrigger: {
          trigger: el,
          // Fires while the element is still below the fold, so by the time it
          // is comfortably readable the motion has already finished. A reveal
          // you actually watch happen reads as a page that is slow.
          start: "top 88%",
          once: true,
        },
      });
    },
    { scope, dependencies: [delay, distance, stagger, select] },
  );

  return (
    <Tag ref={scope} className={className} id={id}>
      {children}
    </Tag>
  );
}
