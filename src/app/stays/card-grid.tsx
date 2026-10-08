"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { prefersReducedMotion } from "@/components/motion/prefers-reduced";

/* ==================================================================== *
 *  THE GRID, ARRIVING.
 *
 *  Twelve cards is too many for <Reveal stagger>: one tween over twelve
 *  targets would start the whole column at once, and the last card would
 *  still be fading in long after it was scrolled past. `ScrollTrigger.batch`
 *  instead groups whatever crosses the fold in the same frame and staggers
 *  only that group, along the reading order — so a full-height screen gets
 *  a row of three settling one after another, and a lone card further down
 *  gets no stagger at all, because there is nothing to stagger it against.
 *
 *  IT ANIMATES ONCE, ON FIRST MOUNT, AND NEVER AGAIN.
 *
 *  The console navigates, so every filter change re-renders this list from
 *  the server while this component stays mounted. Re-running the reveal
 *  there would mean the grid flickering out and back on every slider
 *  settle — a page that flinches each time you touch a control. Cards that
 *  arrive later simply appear: the results are the answer to a question the
 *  visitor just asked, and an answer should already be there.
 *
 *  What DOES happen on a filter change is `settle()`: the triggers are
 *  re-measured, because the grid above them changed height and every start
 *  position below it is now a lie — and anything still hidden that is now
 *  on screen is shown outright. Nothing may be left invisible because a
 *  trigger fired against a stale measurement, or never fired at all.
 * ==================================================================== */

export interface CardGridProps {
  className?: string;
  /**
   * Canonical query string behind these results. Only used to notice that the
   * catalog was re-cut — the value itself is never read.
   */
  signature: string;
  children: ReactNode;
}

export function CardGrid({ className, signature, children }: CardGridProps): ReactNode {
  const scope = useRef<HTMLUListElement>(null);
  const settle = useRef<(() => void) | null>(null);
  const mounted = useRef(false);

  useGSAP(
    () => {
      const el = scope.current;
      if (!el) return;
      if (prefersReducedMotion()) return;

      const cards = gsap.utils.toArray<HTMLElement>(":scope > li", el);
      if (cards.length === 0) return;

      const mm = gsap.matchMedia();

      /* A phone shows one card at a time, so there is no "reading order"
         across a row to stagger along and no second card on screen to
         stagger against. It gets the simpler thing: each card lifts on its
         own, a shorter distance, one trigger at a time. */
      mm.add(
        { column: "(max-width: 640px)", grid: "(min-width: 641px)" },
        (context) => {
          const column = context.conditions?.column === true;

          const arrive = (batch: Element[]) =>
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              duration: column ? 0.65 : 0.8,
              ease: "power2.out",
              stagger: column ? 0 : 0.07,
              overwrite: true,
            });

          gsap.set(cards, { opacity: 0, y: column ? 10 : 16 });

          ScrollTrigger.batch(cards, {
            // Well below the fold: by the time a card is comfortably
            // readable it has finished arriving.
            start: "top 92%",
            once: true,
            onEnter: arrive,
          });

          /* The safety net, and the reason this component exists rather
             than a bare batch. A card that is already on screen and still
             invisible is content that has been eaten — whatever the reason,
             it is shown. Cards below the fold are left alone: for them,
             invisible is simply "not yet". */
          const rescue = () => {
            const stuck = cards.filter((card) => {
              if (!card.isConnected) return false;
              if (Number(gsap.getProperty(card, "opacity")) > 0) return false;
              if (gsap.isTweening(card)) return false;
              const box = card.getBoundingClientRect();
              return box.top < window.innerHeight && box.bottom > 0;
            });
            if (stuck.length > 0) arrive(stuck);
          };

          settle.current = () => {
            ScrollTrigger.refresh();
            rescue();
          };

          gsap.delayedCall(1.2, rescue);

          return () => {
            settle.current = null;
          };
        },
      );

      return () => mm.revert();
    },
    { scope, dependencies: [] },
  );

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    settle.current?.();
  }, [signature]);

  return (
    <ul ref={scope} className={className}>
      {children}
    </ul>
  );
}
