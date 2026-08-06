import type { ReactNode } from "react";

import { f1, seeded } from "@/components/scene/geometry";

import s from "./solitude.module.css";

/* -------------------------------------------------------------------- *
 *  SILENCE — sixty seconds of measured ambient, and the mean across it.
 *
 *  Two houses have to be comparable by eye: a quiet one draws a low, tight
 *  trace and a louder one a taller, more agitated one. The amber rule is
 *  the published mean.
 * -------------------------------------------------------------------- */

/* The scale is fixed rather than fitted to the reading. Every house in the
   catalog measures between 21 and 41 dB, so 15–50 spends the strip's height
   where the differences actually are: a 21 dB trace has to look emptier than
   a 38 dB one, on the same axis, or the instrument is decoration. */
const FLOOR = 15;
const CEILING = 50;
const BARS = 34;

/** The reference the strip prints against — a room where people read. */
const REFERENCE_DB = 40;

export interface SilenceStripProps {
  /** The published mean, in dB. Lower is quieter is better. */
  db: number;
  /** Seed the sixty-second trace. Same seed, same trace, forever. */
  seed?: number;
}

export function SilenceStrip({ db, seed = 313 }: SilenceStripProps): ReactNode {
  const toY = (value: number) =>
    46 - ((Math.min(CEILING, Math.max(FLOOR, value)) - FLOOR) / (CEILING - FLOOR)) * 40;

  /* Spread is bounded by the headroom above the floor, so a 21 dB reading
     cannot draw bars below the bottom of its own scale. */
  const spread = Math.min(3.6, Math.max(0.4, (db - FLOOR) * 0.5));
  const rand = seeded(seed);
  const bars = Array.from({ length: BARS }, () => db - spread + rand() * spread * 2);

  return (
    <svg
      className={s.device}
      viewBox="0 0 260 52"
      role="img"
      aria-label={`Ambient level, ${db} decibels mean over sixty seconds`}
    >
      <line x1="0" y1="46" x2="260" y2="46" stroke="#93b382" strokeWidth="1" opacity="0.16" />
      <line
        x1="0"
        y1={f1(toY(REFERENCE_DB))}
        x2="260"
        y2={f1(toY(REFERENCE_DB))}
        stroke="#7e9084"
        strokeWidth="1"
        strokeDasharray="1 5"
        opacity="0.45"
      />
      <text className={s.deviceTick} x="258" y={toY(REFERENCE_DB) - 4} textAnchor="end">
        {REFERENCE_DB} · a reading room
      </text>
      <g stroke="#93b382" strokeWidth="2.4" opacity="0.62">
        {bars.map((value, i) => (
          <line
            key={i}
            x1={f1(4 + i * 7.6)}
            y1="46"
            x2={f1(4 + i * 7.6)}
            y2={f1(toY(value))}
            opacity={Math.min(1, Math.max(0.18, 0.42 + (value - db + 4) / 16)).toFixed(2)}
          />
        ))}
      </g>
      <line
        x1="0"
        y1={f1(toY(db))}
        x2="260"
        y2={f1(toY(db))}
        stroke="#e9a85e"
        strokeWidth="1"
        opacity="0.72"
      />
    </svg>
  );
}
