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
  /** Panel-sized rather than hero-sized: smaller labels, no side padding. */
  compact?: boolean;
}

export function ReachLine({ km, left, right, compact = false }: ReachLineProps): ReactNode {
  const vars = {
    "--minor": `calc(100% / ${km})`,
    "--major": `calc(100% * 10 / ${km})`,
  } as CSSProperties;

  return (
    <figure
      className={compact ? `${s.reach} ${s.reachSmall}` : s.reach}
      style={vars}
      role="img"
      aria-label={`${formatKm(km)} kilometres from ${left} to the ${right}`}
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
    </figure>
  );
}
