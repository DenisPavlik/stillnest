import type { CSSProperties, ReactNode } from "react";

import { formatKm } from "@/lib/format";

import s from "./solitude.module.css";

/* -------------------------------------------------------------------- *
 *  THE REACH LINE — the signature instrument. A measured hairline: your
 *  door at one end, the nearest other door at the other, and the fog in
 *  between.
 *
 *  Built in HTML rather than SVG on purpose: the rule has to stretch from
 *  335px to 900px without ever distorting a letterform or an end point.
 *  Ticks are a repeating gradient, so 1 km stays 1 km at every width.
 * -------------------------------------------------------------------- */

export interface ReachLineProps {
  /** Kilometres to the nearest permanent dwelling. */
  km: number;
  /** Label at the lit end — the house you are standing in. */
  left: string;
  /** Label at the far end — what is out there. */
  right: string;
  /**
   * One plain sentence saying what the measurement is, in body type rather
   * than in the instrument's own mono caps.
   *
   * The end labels alone do not carry it. They are 10px, tracked out and
   * dimmed to sit under the picture, and they name the two ends without ever
   * saying what the distance between them means — so the eye takes the number
   * and skips the sentence it belongs to. Pass this anywhere the instrument
   * stands on its own; omit it where the surrounding table already explains
   * the reading.
   */
  note?: string;
  /** Panel-sized rather than hero-sized: smaller labels, no side padding. */
  compact?: boolean;
}

export function ReachLine({ km, left, right, note, compact = false }: ReachLineProps): ReactNode {
  const vars = {
    "--minor": `calc(100% / ${km})`,
    "--major": `calc(100% * 10 / ${km})`,
  } as CSSProperties;

  return (
    /* `data-reach` is the one animation hook, and it is on the whole figure
       on purpose. The rule used to widen from zero so the measurement drew
       itself out to its reading — a nice idea that read, on the page, as a
       bar crawling sideways while you waited for it. The instrument now
       arrives the way everything else on the site does: as one piece, lifted
       and faded in. Nothing inside it is animated separately. */
    <figure
      className={compact ? `${s.reach} ${s.reachSmall}` : s.reach}
      style={vars}
      data-reach
      role="img"
      /* `role="img"` makes every descendant presentational, so the note has
         to be spoken here or it is not spoken at all. */
      aria-label={
        `${formatKm(km)} kilometres from ${left} to the ${right}` +
        (note ? `. ${note}` : "")
      }
    >
      <span className={s.reachValue}>{formatKm(km)} km</span>
      <span className={s.reachRule}>
        <span className={s.reachMinor} aria-hidden="true" />
        <span className={s.reachMajor} aria-hidden="true" />
        <span className={s.reachHere} aria-hidden="true" />
        <span className={s.reachThere} aria-hidden="true" />
      </span>
      <figcaption className={s.reachEnds}>
        <span>{left}</span>
        <span>{right}</span>
      </figcaption>
      {note ? <p className={s.reachNote}>{note}</p> : null}
    </figure>
  );
}
