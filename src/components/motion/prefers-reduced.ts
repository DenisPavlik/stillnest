/**
 * Does this visitor want motion?
 *
 * `MotionProvider` stamps `data-motion` onto <html>, but it does so from a
 * `useEffect` — and `useGSAP` runs in a *layout* effect, which React flushes
 * first. On the very first mount the attribute is therefore not there yet, so a
 * component that trusted it alone would play its animation exactly once for
 * someone who explicitly asked for none. Read the media query as well and the
 * answer is correct from the first frame.
 *
 * The attribute still wins when present: it is the switch the rest of the site
 * is written against, and it is what a future "reduce motion" toggle would set.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;

  const flag = document.documentElement.dataset.motion;
  if (flag === "reduced") return true;
  if (flag === "full") return false;

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
