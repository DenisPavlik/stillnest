import type { ReactNode } from "react";

/* ==================================================================== *
 *  AMENITY ICONS — drawn here, in the same 24-unit grid, at the same
 *  weight. No icon library and no emoji: an emoji is somebody else's
 *  drawing at somebody else's colour temperature, and it would be the
 *  only thing on the page not made of this palette.
 *
 *  Every glyph is a thin outline of the object itself. `no-wifi` is the
 *  only one that draws an absence, because that is the amenity.
 *
 *  Keyed on the amenity slug first and the stored `icon` hint second, so
 *  a new amenity without a drawing degrades to a mark rather than a gap.
 * ==================================================================== */

const GLYPHS: Record<string, ReactNode> = {
  /* wood stove — a firebox on legs, lit. The flame carries the whole glyph
     at 26px, so it is drawn large and the door furniture is left off. */
  "wood-stove": (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="14.6" rx="1.4" />
      <path d="M6.2 18v2.6M17.8 18v2.6" />
      <path d="M12 15.4c2.1 0 3.6-1.4 3.6-3.3 0-2.3-2-3.5-2.8-5.9-1 .9-1.5 1.9-1.5 2.9 0 .7-.5 1.1-1 .7-.3-.3-.4-.8-.4-1.3-1 1-1.9 2.2-1.9 3.6 0 1.9 1.6 3.3 4 3.3Z" />
    </>
  ),

  /* sauna — heat coming off stones */
  sauna: (
    <>
      <path d="M3.4 20.4h17.2" />
      <path d="M5.6 16.8h12.8" />
      <path d="M6.6 13.4c0-2 2.2-2.4 2.2-4.4S6.6 6.6 6.6 4.6" />
      <path d="M12 13.4c0-2 2.2-2.4 2.2-4.4S12 6.6 12 4.6" />
      <path d="M17.4 13.4c0-2 2.2-2.4 2.2-4.4s-2.2-2.4-2.2-4.4" />
    </>
  ),

  /* off-grid power — a panel facing the only source there is */
  "off-grid-power": (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M12 1.5V3M12 11v1.5M17.5 7H19M5 7h1.5M15.9 3.1l1-1M7.1 11.9l-1 1M15.9 10.9l1 1M7.1 2.1l-1-1" />
      <path d="M4 20.5h16l-2-5H6l-2 5Z" />
      <path d="M9.4 15.5 8.4 20.5M14.6 15.5l1 5M5.2 18h13.6" />
    </>
  ),

  /* well water */
  "well-water": (
    <>
      <path d="M12 2.4c3.7 4.9 6.1 7.7 6.1 10.9a6.1 6.1 0 0 1-12.2 0c0-3.2 2.4-6 6.1-10.9Z" />
      <path d="M8.8 13.6a3.2 3.2 0 0 0 3.2 3.2" />
    </>
  ),

  /* reading room */
  "reading-room": (
    <>
      <path d="M12 6.6C10.6 5.5 8.8 5 6.4 5H3.5v12.4h3.1c2.2 0 4 .5 5.4 1.6 1.4-1.1 3.2-1.6 5.4-1.6h3.1V5h-2.9c-2.4 0-4.2.5-5.6 1.6Z" />
      <path d="M12 6.6V19" />
    </>
  ),

  /* outdoor bath — a tub with water in it, outside */
  "outdoor-bath": (
    <>
      <path d="M3.5 12h17v2.2a4.8 4.8 0 0 1-4.8 4.8H8.3a4.8 4.8 0 0 1-4.8-4.8V12Z" />
      <path d="M6.5 19v1.6M17.5 19v1.6" />
      <path d="M6.5 12V6.2a1.9 1.9 0 0 1 3.8 0" />
      <path d="M9.1 8.4h2.4" />
    </>
  ),

  /* skis provided */
  "skis-provided": (
    <>
      <path d="M6.5 3.5v14.2c0 1.6.9 2.6 2.2 2.6" />
      <path d="M11.5 3.5v14.2c0 1.6.9 2.6 2.2 2.6" />
      <path d="M17 5.5v11.8" />
      <path d="M15.4 17.3h3.2" />
      <path d="M4.6 3.5h3.8M9.6 3.5h3.8" />
    </>
  ),

  /* boat */
  boat: (
    <>
      <path d="M3 15.2h18l-2.1 4a1.9 1.9 0 0 1-1.7 1H6.8a1.9 1.9 0 0 1-1.7-1L3 15.2Z" />
      <path d="M12 15.2V3.4" />
      <path d="M12 5.6c2.6.7 4.4 1.9 5.6 3.6-1.9.9-3.7 1.2-5.6 1.1" />
    </>
  ),

  /* telescope — the amenity is the instrument, not the star */
  telescope: (
    <>
      <path d="M3.4 12.6 15.6 7l1.9 4.2-12.2 5.6-1.9-4.2Z" />
      <path d="m17.8 6.1 2.8 6.1" />
      <path d="M9.5 15v2.4l-3 3.1M9.5 17.4l3 3.1" />
    </>
  ),

  /* no wifi, on purpose — the one glyph that draws an absence */
  "no-wifi": (
    <>
      <path d="M2.8 8.8A14.4 14.4 0 0 1 12 5.6c3.5 0 6.7 1.2 9.2 3.2" />
      <path d="M6 12.4A9.4 9.4 0 0 1 12 10.3c2.3 0 4.4.8 6 2.1" />
      <path d="M9.2 15.9a5 5 0 0 1 5.6 0" />
      <circle cx="12" cy="19.2" r="0.9" />
      <path d="M3.6 20.4 20.4 3.6" />
    </>
  ),
};

/** The stored `icon` column, for amenities added after this file was written. */
const BY_ICON: Record<string, string> = {
  flame: "wood-stove",
  steam: "sauna",
  sun: "off-grid-power",
  drop: "well-water",
  book: "reading-room",
  bath: "outdoor-bath",
  ski: "skis-provided",
  boat: "boat",
  star: "telescope",
  "signal-off": "no-wifi",
};

export interface AmenityIconProps {
  slug: string;
  /** The `amenities.icon` hint, used only when the slug is unknown here. */
  icon?: string | null;
  className?: string;
}

export function AmenityIcon({ slug, icon, className }: AmenityIconProps): ReactNode {
  const glyph = GLYPHS[slug] ?? (icon ? GLYPHS[BY_ICON[icon] ?? ""] : undefined);

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {glyph ?? <circle cx="12" cy="12" r="5.5" />}
    </svg>
  );
}
