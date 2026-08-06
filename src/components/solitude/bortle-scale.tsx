import type { ReactNode } from "react";

import { f1, seeded } from "@/components/scene/geometry";

import { bortleFill } from "./readings";
import s from "./solitude.module.css";

/* -------------------------------------------------------------------- *
 *  DARK SKY — the Bortle scale as nine cells that get brighter and
 *  emptier from left to right. The scale is inverted: 1 is the prize.
 *  The cell you actually have is the only one with an amber frame.
 * -------------------------------------------------------------------- */

export interface BortleScaleProps {
  /** Bortle class, 1 (pristine) to 9 (inner city). */
  bortle: number;
}

export function BortleScale({ bortle }: BortleScaleProps): ReactNode {
  const active = Math.min(9, Math.max(1, Math.round(bortle))) - 1;

  const cells = Array.from({ length: 9 }, (_, i) => {
    const stars = Math.max(0, 13 - i * 2);
    const rand = seeded(900 + i * 17);
    return {
      i,
      fill: bortleFill(i),
      dots: Array.from({ length: stars }, () => ({
        x: rand() * 22,
        y: rand() * 30,
        r: 0.5 + rand() * 0.75,
      })),
    };
  });

  return (
    <svg
      className={s.device}
      viewBox="0 0 260 52"
      role="img"
      aria-label={`Bortle class ${active + 1} of 9`}
    >
      {cells.map((c) => {
        const x = 2 + c.i * 28.2;
        return (
          <g key={c.i}>
            <rect x={f1(x)} y="4" width="24.6" height="32" fill={c.fill} />
            <g fill="#e9f0e6">
              {c.dots.map((d, k) => (
                <circle
                  key={k}
                  cx={f1(x + 1.2 + d.x)}
                  cy={f1(6 + d.y)}
                  r={d.r.toFixed(2)}
                  opacity={c.i < 4 ? 0.8 : 0.25}
                />
              ))}
            </g>
            {c.i === active ? (
              <>
                <rect
                  x={f1(x - 1.4)}
                  y="0.6"
                  width="27.4"
                  height="38.8"
                  fill="none"
                  stroke="#e9a85e"
                  strokeWidth="1"
                />
                <text className={s.deviceTick} x={f1(x + 12.3)} y="50" textAnchor="middle">
                  {c.i + 1}
                </text>
              </>
            ) : null}
          </g>
        );
      })}
      {active !== 0 ? (
        <text className={s.deviceTick} x="0" y="50" opacity="0.6">
          1
        </text>
      ) : null}
      {active !== 8 ? (
        <text className={s.deviceTick} x="260" y="50" textAnchor="end" opacity="0.6">
          9
        </text>
      ) : null}
    </svg>
  );
}
