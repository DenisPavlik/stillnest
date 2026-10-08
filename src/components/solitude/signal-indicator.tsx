import type { ReactNode } from "react";

import type { Connectivity } from "@/lib/db/queries";

import s from "./solitude.module.css";

/* -------------------------------------------------------------------- *
 *  SIGNAL — the absence, drawn. Four bars, and a line through them when
 *  there is nothing to fill them with.
 *
 *  "none" is the best reading on this instrument, so it is the one that
 *  gets the strongest mark.
 * -------------------------------------------------------------------- */

const HEIGHTS = [10, 18, 26, 34];

const LIT: Record<Connectivity, number> = { none: 0, weak: 1, full: 4 };

/* Kept under ~26 characters: at 8.5px mono with 0.1em tracking that is the
   most that fits between the bars and the right edge of the instrument. */
const CAPTION: Record<Connectivity, [string, string]> = {
  none: ["no cellular · no broadband", "satellite handset only"],
  weak: ["one bar · no broadband", "outdoors, in one place"],
  full: ["cellular · broadband", "switchable at the meter"],
};

export interface SignalIndicatorProps {
  connectivity: Connectivity;
  /** Distance to the nearest mast, if it was measured. Replaces the second line. */
  mastKm?: number;
}

export function SignalIndicator({ connectivity, mastKm }: SignalIndicatorProps): ReactNode {
  const lit = LIT[connectivity];

  return (
    <svg
      className={s.device}
      viewBox="0 0 260 52"
      role="img"
      aria-label={
        connectivity === "none"
          ? "No cellular signal"
          : `Cellular signal: ${connectivity}`
      }
    >
      <line x1="0" y1="46" x2="260" y2="46" stroke="#93b382" strokeWidth="1" opacity="0.16" />
      <g fill="none" stroke="#7e9084" strokeWidth="1" opacity="0.5">
        {HEIGHTS.map((h, i) => (
          <rect key={i} x={6 + i * 18} y={46 - h} width="11" height={h} />
        ))}
      </g>
      {lit > 0 ? (
        <g fill="#93b382" opacity="0.55">
          {HEIGHTS.slice(0, lit).map((h, i) => (
            <rect key={i} x={6 + i * 18} y={46 - h} width="11" height={h} />
          ))}
        </g>
      ) : null}
      {lit === 0 ? (
        <line x1="0" y1="49" x2="82" y2="9" stroke="#93b382" strokeWidth="1" opacity="0.85" />
      ) : null}
      <text className={s.deviceTick} x="100" y="26">
        {CAPTION[connectivity][0]}
      </text>
      <text className={s.deviceTick} x="100" y="42" opacity="0.7">
        {mastKm !== undefined ? `nearest mast ${mastKm} km` : CAPTION[connectivity][1]}
      </text>
    </svg>
  );
}
