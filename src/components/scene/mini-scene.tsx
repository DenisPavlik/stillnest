import type { ReactNode } from "react";

import type { Biome } from "@/lib/db/queries";

import { band, f1, ridge, seeded } from "./geometry";

/* ==================================================================== *
 *  CARD SCENES — the same media-slot contract at card size.
 *
 *  One scene per biome, built from five archetypes: forest, grove, coast,
 *  ridge and plain. Each is a silhouette, a ground line and one lit
 *  window — the house is always small, because the distance is the
 *  product and a big cabin sells the wrong thing.
 *
 *  Everything is seeded, so a given house draws the same trees on the
 *  server and in the browser, forever.
 * ==================================================================== */

type Archetype = "forest" | "grove" | "coast" | "ridge" | "plain";

interface Tone {
  archetype: Archetype;
  sky: [string, string];
  ground: string;
  haze: string;
  /** Pale snowfield instead of undergrowth; stars for skies worth looking at. */
  snow?: boolean;
  stars?: boolean;
}

const TONES: Record<Biome, Tone> = {
  forest: {
    archetype: "forest",
    sky: ["#0a100c", "#212e24"],
    ground: "#080d09",
    haze: "rgba(168,192,172,0.14)",
  },
  bamboo: {
    archetype: "grove",
    sky: ["#080f0b", "#1f2c1e"],
    ground: "#070d08",
    haze: "rgba(176,196,150,0.13)",
  },
  coast: {
    archetype: "coast",
    sky: ["#08100e", "#1b2b26"],
    ground: "#060c0a",
    haze: "rgba(168,196,184,0.13)",
  },
  highland: {
    archetype: "ridge",
    sky: ["#0a0f0d", "#232e28"],
    ground: "#0a0f0d",
    haze: "rgba(190,206,192,0.14)",
  },
  snow: {
    archetype: "ridge",
    sky: ["#0a1012", "#242f2e"],
    ground: "#0d1416",
    haze: "rgba(198,212,208,0.16)",
    snow: true,
    stars: true,
  },
  desert: {
    archetype: "plain",
    sky: ["#0b0e0c", "#28291f"],
    ground: "#0a0a08",
    haze: "rgba(206,192,158,0.12)",
    stars: true,
  },
};

/** The same building, seen from further away. x/y is the ground line, left edge. */
function MiniHouse({
  uid,
  x,
  y,
  w,
  ratio = 0.3,
}: {
  uid: string;
  x: number;
  y: number;
  w: number;
  ratio?: number;
}): ReactNode {
  const h = w * ratio;
  return (
    <g>
      <ellipse
        cx={f1(x + w / 2)}
        cy={f1(y - h * 0.3)}
        rx={f1(w * 0.78)}
        ry={f1(w * 0.345)}
        fill={`url(#${uid}-warm)`}
      />
      <rect x={f1(x)} y={f1(y - h)} width={f1(w)} height={f1(h)} fill="#080c09" />
      <rect
        x={f1(x + w * 0.1)}
        y={f1(y - h * 0.82)}
        width={f1(w * 0.52)}
        height={f1(h * 0.4)}
        fill="#dda05e"
        opacity="0.62"
        filter={`url(#${uid}-b)`}
      />
      <rect
        x={f1(x - w * 0.07)}
        y={f1(y - h - w * 0.055)}
        width={f1(w * 1.14)}
        height={f1(w * 0.055)}
        fill="#0a0f0b"
      />
    </g>
  );
}

/** Bamboo: no silhouette to speak of, only verticals and the gaps between. */
function culms(o: {
  seed: number;
  count: number;
  from: number;
  to: number;
  base: number;
  minH: number;
  maxH: number;
  width: number;
}): { d: string; nodes: string } {
  const rand = seeded(o.seed);
  const span = o.to - o.from;
  let d = "";
  let nodes = "";
  for (let i = 0; i < o.count; i += 1) {
    const x = o.from + (span * (i + rand() * 0.6)) / o.count;
    const h = o.minH + Math.pow(rand(), 1.2) * (o.maxH - o.minH);
    const lean = (rand() - 0.5) * o.width * 3.4;
    const w = o.width * (0.7 + rand() * 0.6);
    const top = o.base - h;
    d += `M${f1(x - w / 2)} ${f1(o.base)}L${f1(x + w / 2)} ${f1(o.base)}L${f1(x + lean + w * 0.34)} ${f1(top)}L${f1(x + lean - w * 0.34)} ${f1(top)}Z`;
    for (let k = 1; k < 4; k += 1) {
      const t = k / 4;
      const ny = o.base - h * t;
      const nx = x + lean * t;
      nodes += `M${f1(nx - w)} ${f1(ny)}L${f1(nx + w)} ${f1(ny)}`;
    }
  }
  return { d, nodes };
}

function scatter(seed: number, count: number, box: [number, number, number, number]) {
  const rand = seeded(seed);
  const [x0, y0, w, h] = box;
  return Array.from({ length: count }, () => ({
    x: x0 + rand() * w,
    y: y0 + rand() * h,
    r: 0.4 + rand() * 0.9,
    o: 0.18 + rand() * 0.5,
  }));
}

export interface MiniSceneProps {
  biome: Biome;
  /** Prefix for every gradient and filter id. Must be unique on the page. */
  uid: string;
  /** Seed the geometry — pass a per-house seed so no two cards draw alike. */
  seed?: number;
  /** The media-slot class from the calling layout. */
  className?: string;
}

export function MiniScene({ biome, uid, seed = 5, className }: MiniSceneProps): ReactNode {
  const tone = TONES[biome];

  const far = band({ seed, count: 22, base: 268, from: -20, to: 620, minH: 40, maxH: 96 });
  const near = band({ seed: seed + 61, count: 16, base: 288, from: -30, to: 640, minH: 70, maxH: 150 });
  const stars = tone.stars ? scatter(seed + 7, 46, [0, 6, 600, 170]) : [];

  /* Two houses in the same biome must not draw the same picture. The house
     slides along the ground line and changes apparent distance; the horizon
     changes shape with it. */
  const vary = seeded(seed + 991);
  const shift = (vary() - 0.5) * 56;
  const scale = 0.88 + vary() * 0.26;
  const crest = 250 + (vary() - 0.5) * 20;
  const amplitude = 58 * (0.78 + vary() * 0.5);

  return (
    <svg
      className={className}
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone.sky[0]} />
          <stop offset="100%" stopColor={tone.sky[1]} />
        </linearGradient>
        <linearGradient id={`${uid}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor={tone.haze} />
        </linearGradient>
        <radialGradient id={`${uid}-warm`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(233,168,94,0.3)" />
          <stop offset="52%" stopColor="rgba(214,140,66,0.08)" />
          <stop offset="100%" stopColor="rgba(214,140,66,0)" />
        </radialGradient>
        <radialGradient id={`${uid}-vig`} cx="50%" cy="46%" r="70%">
          <stop offset="46%" stopColor="rgba(4,7,5,0)" />
          <stop offset="100%" stopColor="rgba(4,7,5,0.68)" />
        </radialGradient>
        <filter id={`${uid}-b`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <rect x="0" y="0" width="600" height="300" fill={`url(#${uid}-sky)`} />

      {stars.length > 0 ? (
        <g fill="#e9f0e6">
          {stars.map((st, i) => (
            <circle
              key={i}
              cx={f1(st.x)}
              cy={f1(st.y)}
              r={st.r.toFixed(2)}
              opacity={st.o.toFixed(2)}
            />
          ))}
        </g>
      ) : null}

      <rect x="0" y="120" width="600" height="180" fill={`url(#${uid}-haze)`} />

      {tone.archetype === "forest" ? (
        <>
          <path d={far} fill="#25332a" opacity="0.55" filter={`url(#${uid}-b)`} />
          <MiniHouse uid={uid} x={344 + shift} y={252} w={92 * scale} />
          <path d={near} fill={tone.ground} />
        </>
      ) : null}

      {tone.archetype === "grove" ? (
        <>
          {/* far culms are fog; near culms are almost black and read as bars */}
          <path
            d={culms({ seed: seed + 3, count: 26, from: -20, to: 620, base: 292, minH: 150, maxH: 250, width: 3.4 }).d}
            fill="#2b3a26"
            opacity="0.5"
            filter={`url(#${uid}-b)`}
          />
          <MiniHouse uid={uid} x={252 + shift * 0.6} y={266} w={78 * scale} />
          {(() => {
            const g = culms({ seed: seed + 29, count: 15, from: -30, to: 640, base: 300, minH: 230, maxH: 320, width: 6.2 });
            return (
              <g>
                <path d={g.d} fill={tone.ground} />
                <path d={g.nodes} stroke="#5d7449" strokeWidth="1" opacity="0.35" fill="none" />
              </g>
            );
          })()}
        </>
      ) : null}

      {tone.archetype === "coast" ? (
        <>
          {/* a low sea horizon, a headland, and the house out on the end of it */}
          <rect x="0" y="182" width="600" height="118" fill="#080f10" />
          <g stroke="#a9c4c8" strokeWidth="1" opacity="0.13">
            {[190, 202, 218, 240, 268].map((y) => (
              <line key={y} x1={y * 0.3} y1={y} x2={600 - y * 0.2} y2={y} />
            ))}
          </g>
          <path
            d="M-20 300 L-20 214 C60 206 130 220 210 214 C290 208 340 196 420 194 L620 190 L620 300 Z"
            fill={tone.ground}
          />
          <MiniHouse uid={uid} x={368 + shift * 0.35} y={195} w={78 * scale} />
          <path d="M138 238 L154 204 L172 238 Z" fill="#050a0b" />
          <path d="M192 248 L204 226 L218 248 Z" fill="#050a0b" opacity="0.8" />
        </>
      ) : null}

      {tone.archetype === "ridge" ? (
        <>
          <path
            d={ridge({ seed: seed + 1201, from: -20, to: 620, base: 300, crest, amplitude })}
            fill={tone.snow ? "#2b3538" : "#222b26"}
            opacity="0.9"
            filter={`url(#${uid}-b)`}
          />
          <path
            d="M-20 300 L-20 262 C120 244 220 270 320 258 C420 246 520 266 620 254 L620 300 Z"
            fill={tone.snow ? "#182022" : "#141b17"}
          />
          <MiniHouse uid={uid} x={214 + shift} y={266} w={84 * scale} />
          {tone.snow ? (
            <g stroke="#c9d7d4" strokeWidth="1" fill="none" opacity="0.16">
              {[272, 281, 290].map((y, i) => (
                <path key={y} d={`M-20 ${y} C160 ${y - 6 - i * 2} 380 ${y + 5} 620 ${y - 3}`} />
              ))}
            </g>
          ) : (
            <path
              d={band({
                seed: seed + 99,
                count: 11,
                base: 276,
                from: 320 + shift,
                to: 560 + shift,
                minH: 18,
                maxH: 44,
              })}
              fill="#0a0f0c"
            />
          )}
        </>
      ) : null}

      {tone.archetype === "plain" ? (
        <>
          {/* nothing stands up out here, so the horizon does all the work */}
          <path
            d={ridge({ seed: seed + 511, from: -20, to: 620, base: 300, crest: 214, amplitude: 13 })}
            fill="#1d1e17"
            opacity="0.85"
            filter={`url(#${uid}-b)`}
          />
          <rect x="0" y="224" width="600" height="76" fill={tone.ground} />
          <MiniHouse uid={uid} x={228 + shift} y={244} w={128 * scale} ratio={0.14} />
          <g fill="#1a1a14">
            {scatter(seed + 71, 26, [0, 246, 600, 52]).map((st, i) => (
              <ellipse
                key={i}
                cx={f1(st.x)}
                cy={f1(st.y)}
                rx={f1(st.r * 3.2)}
                ry={f1(st.r * 1.4)}
                opacity={(st.o * 0.9).toFixed(2)}
              />
            ))}
          </g>
        </>
      ) : null}

      <rect x="0" y="0" width="600" height="300" fill={`url(#${uid}-vig)`} />
    </svg>
  );
}
