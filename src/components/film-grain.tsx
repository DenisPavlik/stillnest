import type { ReactNode } from "react";

import s from "./film-grain.module.css";

/* -------------------------------------------------------------------- *
 *  FILM GRAIN — fixed to the viewport like a lens rather than painted
 *  onto the scene, so it does not travel with the page as it scrolls.
 *
 *  One per page: the filter carries an id.
 * -------------------------------------------------------------------- */

export function FilmGrain({ uid = "fn-grain" }: { uid?: string }): ReactNode {
  return (
    <svg className={s.grain} aria-hidden="true">
      <filter id={uid}>
        <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${uid})`} />
    </svg>
  );
}
