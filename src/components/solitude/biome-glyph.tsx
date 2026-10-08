import type { ReactNode } from "react";

import type { Biome } from "@/lib/db/queries";
import { band, f1, ridge, seeded } from "@/components/scene/geometry";

import { biomeGround } from "./readings";
import s from "./solitude.module.css";

/* -------------------------------------------------------------------- *
 *  BIOME — what is actually standing around the house, drawn as the
 *  skyline you would see from the door, plus the ground under it.
 *
 *  Not an icon set: each biome is a different silhouette against the same
 *  ground line, so the shape carries the information rather than a symbol.
 * -------------------------------------------------------------------- */

const GROUND = 45;

function silhouette(biome: Biome): ReactNode {
  switch (biome) {
    case "forest":
      return (
        <path
          d={band({ seed: 8, count: 15, base: 42, from: 2, to: 258, minH: 16, maxH: 36 })}
          fill="#35513a"
          opacity="0.85"
        />
      );

    case "bamboo": {
      const rand = seeded(212);
      return (
        <g stroke="#4e6b39" strokeWidth="1.6" opacity="0.8" fill="none">
          {Array.from({ length: 26 }, (_, i) => {
            const x = 4 + i * 9.8 + rand() * 3;
            const h = 16 + Math.pow(rand(), 1.2) * 26;
            const lean = (rand() - 0.5) * 5;
            return <line key={i} x1={f1(x)} y1={GROUND} x2={f1(x + lean)} y2={f1(GROUND - h)} />;
          })}
        </g>
      );
    }

    case "coast":
      return (
        <g>
          <path
            d="M0 45 L0 30 C34 27 58 34 92 31 C118 28.6 132 22 158 21 L260 19 L260 45 Z"
            fill="#2a4247"
            opacity="0.85"
          />
          <g stroke="#7e9084" strokeWidth="1" opacity="0.3">
            {[36, 40].map((y) => (
              <line key={y} x1="0" y1={y} x2="120" y2={y} />
            ))}
          </g>
        </g>
      );

    case "snow":
      return (
        <g>
          <path
            d={ridge({ seed: 44, from: 0, to: 260, base: 45, crest: 34, amplitude: 12 })}
            fill="#3b4a4d"
            opacity="0.8"
          />
          <g stroke="#c9d7d4" strokeWidth="1" fill="none" opacity="0.22">
            {[38, 42].map((y, i) => (
              <path key={y} d={`M0 ${y} C70 ${y - 3 - i} 170 ${y + 2} 260 ${y - 1}`} />
            ))}
          </g>
        </g>
      );

    case "desert":
      return (
        <g>
          <path
            d={ridge({ seed: 91, from: 0, to: 260, base: 45, crest: 37, amplitude: 5 })}
            fill="#3d3a2c"
            opacity="0.85"
          />
          <g fill="#4a4636" opacity="0.6">
            {[28, 96, 174, 231].map((x, i) => (
              <ellipse key={x} cx={x} cy={43 - i * 0.4} rx={4 + i} ry="1.6" />
            ))}
          </g>
        </g>
      );

    default:
      return (
        <path
          d={ridge({ seed: 17, from: 0, to: 260, base: 45, crest: 32, amplitude: 13 })}
          fill="#33463c"
          opacity="0.85"
        />
      );
  }
}

export interface BiomeGlyphProps {
  biome: Biome;
  /** Override the ground legend. Defaults to the standard line for the biome. */
  note?: string;
}

export function BiomeGlyph({ biome, note }: BiomeGlyphProps): ReactNode {
  return (
    <svg
      className={s.device}
      viewBox="0 0 260 56"
      role="img"
      aria-label={`Biome: ${biome}`}
    >
      {silhouette(biome)}
      <line x1="0" y1={GROUND} x2="260" y2={GROUND} stroke="#93b382" strokeWidth="1" opacity="0.28" />
      <text className={s.deviceTick} x="0" y="51.5" opacity="0.7">
        {note ?? biomeGround(biome)}
      </text>
    </svg>
  );
}
