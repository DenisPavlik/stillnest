import type { ReactNode } from "react";

import { formatKm } from "@/lib/format";

import { BiomeGlyph } from "./biome-glyph";
import { BortleScale } from "./bortle-scale";
import { ReachLine } from "./reach-line";
import { SignalIndicator } from "./signal-indicator";
import { SilenceStrip } from "./silence-strip";
import {
  SOLITUDE_NOTE,
  biomeNote,
  bortleNote,
  compositeIndex,
  signalNote,
  silenceNote,
  type SolitudeReadings,
} from "./readings";
import s from "./solitude.module.css";

/* ==================================================================== *
 *  THE SOLITUDE INDEX PANEL — five readings, five different instruments.
 *
 *  Five identical stat cards would read as marketing numbers. Five
 *  different instruments read as measurements, which is what they are:
 *  a distance meter has no business looking like a light-pollution scale.
 * ==================================================================== */

const DEFAULT_META = [
  "Surveyed on foot, after dark",
  "Instruments at 1.5 m · 60-second window",
] as const;

export interface SolitudeIndexProps {
  /** The house being reported on. */
  name: string;
  /** One line under the name — region, country, coordinates. */
  where: string;
  readings: SolitudeReadings;
  /** Right-hand survey meta. Two short mono lines look best. */
  meta?: readonly string[];
  /** What sits at the far end of the reach line. */
  reachTo?: string;
  /** Seeds the sixty-second silence trace — pass a per-house seed. */
  seed?: number;
  /** Override the composite. Defaults to `compositeIndex(readings)`. */
  score?: number;
  /** Layout hook for the calling page — spacing belongs to the page. */
  className?: string;
}

export function SolitudeIndex({
  name,
  where,
  readings,
  meta = DEFAULT_META,
  reachTo = "nearest dwelling",
  seed,
  score,
  className,
}: SolitudeIndexProps): ReactNode {
  const rows: {
    label: string;
    value: string;
    unit?: string;
    note: string;
    device: ReactNode;
  }[] = [
    {
      label: "Solitude",
      value: formatKm(readings.solitudeKm),
      unit: "km",
      note: SOLITUDE_NOTE,
      device: <ReachLine km={readings.solitudeKm} left={name} right={reachTo} compact />,
    },
    {
      label: "Silence",
      value: String(readings.noiseDb),
      unit: "dB",
      note: silenceNote(readings.noiseDb),
      device: <SilenceStrip db={readings.noiseDb} seed={seed} />,
    },
    {
      label: "Signal",
      value: readings.connectivity,
      note: signalNote(readings.connectivity),
      device: <SignalIndicator connectivity={readings.connectivity} />,
    },
    {
      label: "Dark sky",
      value: String(readings.bortle),
      unit: "Bortle",
      note: bortleNote(readings.bortle),
      device: <BortleScale bortle={readings.bortle} />,
    },
    {
      label: "Biome",
      value: readings.biome,
      note: biomeNote(readings.biome),
      device: <BiomeGlyph biome={readings.biome} />,
    },
  ];

  return (
    /* `data-panel-row` marks the bands a caller may bring on one at a time —
       the head, the five instruments, the composite. Five readings arriving
       together are a spec sheet; arriving in order they are five instruments
       reporting in. */
    <article className={className ? `${s.panel} ${className}` : s.panel}>
      <header className={s.panelHead} data-panel-row>
        <div>
          <h3 className={s.panelName}>{name}</h3>
          <p className={s.panelWhere}>{where}</p>
        </div>
        <p className={s.panelMeta}>
          {meta.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </header>

      <ul className={s.metrics}>
        {rows.map((row) => (
          <li key={row.label} className={s.metric} data-panel-row>
            <p className={s.mLabel}>{row.label}</p>
            <p className={s.mValue}>
              {row.value}
              {row.unit ? <span className={s.mUnit}>{row.unit}</span> : null}
            </p>
            <div className={s.mDevice}>{row.device}</div>
            <p className={s.mNote}>{row.note}</p>
          </li>
        ))}
      </ul>

      <footer className={s.panelFoot} data-panel-row>
        <span>Composite index</span>
        <span className={s.panelScore}>
          {score ?? compositeIndex(readings)}
          <i>/100</i>
        </span>
        <span className={s.panelFootNote}>
          Higher is emptier. Weighted on distance first, then level, darkness and signal.
        </span>
      </footer>
    </article>
  );
}
