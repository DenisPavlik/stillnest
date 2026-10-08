import type { ReactNode } from "react";

import { portraitSources, stillSources } from "@/lib/media";

import s from "./still.module.css";

/* -------------------------------------------------------------------- *
 *  STILL — one photograph in a media slot.
 *
 *  Every real photograph on the site goes through this. The markup is
 *  six lines of <source> and easy to get subtly wrong — a missing
 *  `sizes`, the art-directed file offered after the landscape set, a
 *  format ordered so WebP never wins — and each mistake is invisible
 *  until someone opens a network panel.
 *
 *  Fills its container with object-fit: cover, exactly as the generated
 *  scenes it replaces did, so a media slot does not care which it gets.
 * -------------------------------------------------------------------- */

export interface StillProps {
  /** Media key without extension — `stays/hollowmoss-04/exterior`. */
  base: string;
  alt: string;
  className?: string;
  /**
   * A second file, art-directed for slots that are taller than they are
   * wide. A landscape photograph in a phone-shaped hero is a geometry
   * problem rather than a crop problem: `cover` keeps the height and
   * throws away two thirds of the width. Omit it for slots that are
   * always landscape — a card, a band — where there is nothing to fix.
   */
  portraitBase?: string;
  /** Set on the one image above the fold; leaves the rest to lazy-load. */
  priority?: boolean;
  /**
   * How wide the slot actually is, so the browser can pick a rung.
   *
   * Defaults to the full-bleed case, which is what the heroes and the interior
   * band are. A card in the three-wide catalog grid is never more than ~440px,
   * and left at `100vw` it would pull the 3072 file to paint it — the exact
   * waste the narrow rung exists to prevent.
   */
  sizes?: string;
}

export function Still({
  base,
  alt,
  className,
  portraitBase,
  priority = false,
  sizes = "100vw",
}: StillProps): ReactNode {
  const landscape = stillSources(base);
  const portrait = portraitBase ? portraitSources(portraitBase) : null;

  return (
    <picture className={className ? `${s.picture} ${className}` : s.picture}>
      {/* Portrait first: a <source> wins on its first media match, so an
          art-directed file offered after the landscape set would never be
          reached. */}
      {portrait ? (
        <>
          <source
            media="(max-aspect-ratio: 1/1)"
            type="image/webp"
            sizes={sizes}
            srcSet={portrait.webp}
          />
          <source media="(max-aspect-ratio: 1/1)" sizes={sizes} srcSet={portrait.jpeg} />
        </>
      ) : null}

      <source type="image/webp" sizes={sizes} srcSet={landscape.webp} />

      {/* A plain <img>, for the reason scene-media.tsx gives: a fixed slot
          filled with object-fit, where next/image's layout machinery buys
          nothing and would also have to be taught about the media host in
          NEXT_PUBLIC_MEDIA_BASE_URL. Inside a <picture> the Next lint rule
          does not fire, because art direction is the one case it cannot
          serve. */}
      <img
        className={s.img}
        sizes={sizes}
        srcSet={landscape.jpeg}
        src={landscape.fallback}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? "sync" : "async"}
      />
    </picture>
  );
}
