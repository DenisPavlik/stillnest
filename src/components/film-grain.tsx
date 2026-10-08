import type { ReactNode } from "react";

import s from "./film-grain.module.css";

/* -------------------------------------------------------------------- *
 *  FILM GRAIN — fixed to the viewport like a lens rather than painted
 *  onto the scene, so it does not travel with the page as it scrolls.
 *
 *  One per page: the filter carries an id.
 *
 *  `data-grain` is the handle the home page thins it with as the hero
 *  leaves. The grain is the page's literal noise, so it is the one thing
 *  that has to stop when the noise does.
 * -------------------------------------------------------------------- */

/**
 * The film grain over every page — a 192 px noise tile, painted once.
 *
 * It used to be a live SVG `feTurbulence` filter on a fixed, full-viewport layer
 * with `mix-blend-mode: overlay`. On an iPhone that is a filter re-rasterised and
 * a blend re-composited against the whole page on every frame of a scroll: the
 * owner's screen recording showed the page dropping to blank frames whenever he
 * flicked. A bitmap tile costs one decode, and on touch screens it is laid on
 * with plain opacity rather than a blend (see the stylesheet).
 */
export function FilmGrain(_: { uid?: string } = {}): ReactNode {
  return <div className={s.grain} aria-hidden="true" data-grain />;
}
