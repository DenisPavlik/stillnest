import type { Metadata } from "next";
import { DM_Mono, Familjen_Grotesk, Instrument_Serif } from "next/font/google";

import s from "./page.module.css";

/* ==================================================================
   STILLNEST — VISUAL DIRECTION: "FIELD STATION"
   A field notebook kept by someone who actually goes to these places.
   Forest-dark base, warm off-white ink, one amber for anything lit.

   Everything visual is generated: layered gradients and inline SVG.
   No external assets, no remote URLs, no unseeded randomness.
   This is a Server Component; the SVG is serialised once, never
   re-derived on the client, so the geometry cannot drift.
================================================================== */

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--fs-serif",
});

const sans = Familjen_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--fs-sans",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--fs-mono",
});

export const metadata: Metadata = {
  title: "Stillnest — Field Station",
  description:
    "Nowhere. On purpose. Off-grid houses, surveyed on site before they are listed.",
};

/* ------------------------------------------------------------------
   DETERMINISTIC GEOMETRY
   Integer hash — exact in double arithmetic, identical everywhere.
------------------------------------------------------------------ */

function hash(n: number): number {
  let x = (Math.imul(n | 0, 1103515245) + 12345) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 2246822519) >>> 0;
  x = (x ^ (x >>> 13)) >>> 0;
  x = Math.imul(x, 3266489917) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  return x / 4294967296;
}

type Tree = { cx: number; h: number; w: number };

/** A stand of spruce spaced across `span`, with seeded jitter. */
function stand(
  seed: number,
  count: number,
  span: number,
  hMin: number,
  hMax: number,
  wMin: number,
  wMax: number,
): Tree[] {
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const a = hash(seed * 977 + i * 13);
    const b = hash(seed * 613 + i * 29 + 7);
    const c = hash(seed * 331 + i * 41 + 3);
    return {
      cx: i * step + (a - 0.5) * step * 1.15,
      h: hMin + (hMax - hMin) * (b * 0.7 + c * 0.3),
      w: wMin + (wMax - wMin) * (c * 0.55 + a * 0.45),
    };
  });
}

/**
 * The upper envelope of a whole stand, swept left to right: at each
 * sample x the highest tree wins. One closed path, so overlapping
 * crowns can never leave holes — the mass below the canopy is solid,
 * and only the tops are individual spires. `notch` steps the profile
 * into branch tiers.
 */
function envelope(
  trees: readonly Tree[],
  base: number,
  span: number,
  {
    step = 3,
    pad = 80,
    drop = 520,
    tiers = 7,
    notch = 0.17,
    taper = 1.08,
  }: {
    step?: number;
    pad?: number;
    drop?: number;
    tiers?: number;
    notch?: number;
    taper?: number;
  } = {},
): string {
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(-pad)} ${f(base + drop)}L${f(-pad)} ${f(base)}`;

  for (let x = -pad; x <= span + pad; x += step) {
    let top = base;
    for (const t of trees) {
      const dx = Math.abs(x - t.cx);
      if (dx > t.w) continue;
      const u = dx / t.w;
      const y = base - t.h * Math.pow(1 - u, taper) * (1 - notch * ((u * tiers) % 1));
      if (y < top) top = y;
    }
    d += `L${f(x)} ${f(top)}`;
  }

  return `${d}L${f(span + pad)} ${f(base)}L${f(span + pad)} ${f(base + drop)}Z`;
}

/* ------------------------------------------------------------------
   HERO STAND-IN
   A foggy spruce basin at dusk, one lit window, still black water.
   Structured as a media slot: replacing the <svg> with an <img> or a
   <video class={s.mediaFill}> changes nothing about the layout.
------------------------------------------------------------------ */

const HW = 1600;
const HH = 900;
const SHORE = 636; // waterline
const HOUSE_X = 838; // left edge of the house — inside the mobile crop too

const FAR_D = envelope(stand(3, 68, HW, 96, 196, 15, 26), SHORE - 30, HW, {
  tiers: 5,
  notch: 0.2,
});
const MID_D = envelope(stand(11, 54, HW, 170, 320, 20, 38), SHORE - 14, HW, {
  tiers: 6,
  notch: 0.18,
});
const NEAR_D = envelope(
  stand(29, 33, HW, 240, 430, 30, 56).filter(
    (t) => Math.abs(t.cx - (HOUSE_X + 48)) > 138,
  ),
  SHORE + 4,
  HW,
  { tiers: 8, notch: 0.15, taper: 1.16 },
);
/** The shore itself: dense low growth that grounds the whole frame. */
const SHORE_D = envelope(stand(47, 96, HW, 16, 54, 10, 22), SHORE + 10, HW, {
  tiers: 3,
  notch: 0.24,
  taper: 1.25,
});

function HeroScene() {
  return (
    <svg
      className={s.mediaFill}
      viewBox={`0 0 ${HW} ${HH}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A dark timber house at the edge of still water in foggy spruce forest at dusk, one window lit."
    >
      <defs>
        <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040706" />
          <stop offset="26%" stopColor="#0A120E" />
          <stop offset="58%" stopColor="#16211B" />
          <stop offset="78%" stopColor="#222F27" />
          <stop offset="100%" stopColor="#1A241E" />
        </linearGradient>
        <radialGradient id="fs-dusk" cx="62%" cy="72%" r="46%">
          <stop offset="0%" stopColor="rgba(222,172,112,0.26)" />
          <stop offset="38%" stopColor="rgba(150,136,94,0.10)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id="fs-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F1815" />
          <stop offset="30%" stopColor="#080E0B" />
          <stop offset="100%" stopColor="#030605" />
        </linearGradient>
        <linearGradient id="fs-win" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE4B6" />
          <stop offset="58%" stopColor="#F2A65A" />
          <stop offset="100%" stopColor="#C2711F" />
        </linearGradient>
        <radialGradient id="fs-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(242,166,90,0.42)" />
          <stop offset="45%" stopColor="rgba(226,140,62,0.13)" />
          <stop offset="100%" stopColor="rgba(226,140,62,0)" />
        </radialGradient>
        <linearGradient id="fs-refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(242,166,90,0.46)" />
          <stop offset="45%" stopColor="rgba(226,140,62,0.16)" />
          <stop offset="100%" stopColor="rgba(226,140,62,0)" />
        </linearGradient>
        <linearGradient id="fs-vig" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(3,6,5,0.74)" />
          <stop offset="24%" stopColor="rgba(3,6,5,0.06)" />
          <stop offset="72%" stopColor="rgba(3,6,5,0)" />
          <stop offset="100%" stopColor="rgba(3,6,5,0.72)" />
        </linearGradient>
        <linearGradient id="fs-vig-x" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(3,6,5,0.66)" />
          <stop offset="24%" stopColor="rgba(3,6,5,0)" />
          <stop offset="80%" stopColor="rgba(3,6,5,0)" />
          <stop offset="100%" stopColor="rgba(3,6,5,0.6)" />
        </linearGradient>

        <filter id="fs-far" x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="fs-mid" x="-8%" y="-8%" width="116%" height="116%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id="fs-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter id="fs-fore" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="fs-mirror" x="-6%" y="-6%" width="112%" height="112%">
          <feGaussianBlur stdDeviation="5" />
        </filter>

        <clipPath id="fs-lake">
          <rect x="0" y={SHORE} width={HW} height={HH - SHORE} />
        </clipPath>
      </defs>

      {/* sky, and the last of the light behind the ridge */}
      <rect width={HW} height={HH} fill="url(#fs-sky)" />
      <rect width={HW} height={HH} fill="url(#fs-dusk)" />

      {/* far ridge, hazed out */}
      <path d={FAR_D} fill="#1E2B24" opacity="0.5" filter="url(#fs-far)" />

      {/* fog held in the basin */}
      <g filter="url(#fs-soft)">
        <ellipse cx="880" cy="470" rx="820" ry="76" fill="rgba(178,198,182,0.10)" />
        <ellipse cx="1120" cy="548" rx="520" ry="46" fill="rgba(200,208,188,0.09)" />
      </g>

      <path d={MID_D} fill="#0D1512" opacity="0.96" filter="url(#fs-mid)" />

      <g filter="url(#fs-soft)">
        <ellipse cx="940" cy="600" rx="640" ry="30" fill="rgba(196,206,186,0.12)" />
      </g>

      {/* the house — dark timber, one room lit, set back off the bank */}
      <g transform="translate(0 -16)">
        <ellipse
          cx={HOUSE_X + 44}
          cy={SHORE - 26}
          rx="146"
          ry="66"
          fill="url(#fs-glow)"
          filter="url(#fs-soft)"
        />
        {/* a long, low box under a flat roof — one glazed run, lit */}
        <rect x={HOUSE_X} y={SHORE - 34} width="124" height="34" fill="#070B09" />
        <rect x={HOUSE_X - 13} y={SHORE - 40} width="150" height="6" fill="#0B120E" />
        <rect
          x={HOUSE_X - 13}
          y={SHORE - 40}
          width="150"
          height="0.9"
          fill="rgba(196,208,188,0.24)"
        />
        <rect x={HOUSE_X + 9} y={SHORE - 29} width="74" height="17" fill="url(#fs-win)" />
        <rect x={HOUSE_X + 33} y={SHORE - 29} width="1" height="17" fill="#080B09" opacity="0.7" />
        <rect x={HOUSE_X + 58} y={SHORE - 29} width="1" height="17" fill="#080B09" opacity="0.7" />
        <rect x={HOUSE_X + 95} y={SHORE - 27} width="15" height="12" fill="#C2711F" opacity="0.4" />
        <rect x={HOUSE_X - 2} y={SHORE - 5} width="128" height="5" fill="#030605" />
        <ellipse
          cx={HOUSE_X + 46}
          cy={SHORE + 2}
          rx="72"
          ry="9"
          fill="rgba(242,166,90,0.16)"
          filter="url(#fs-mirror)"
        />
      </g>

      {/* nearest trees, then the shore growth */}
      <path d={NEAR_D} fill="#050908" />
      <path d={SHORE_D} fill="#030605" />

      {/* water */}
      <rect x="0" y={SHORE} width={HW} height={HH - SHORE} fill="url(#fs-water)" />
      <g clipPath="url(#fs-lake)">
        <g
          transform={`translate(0 ${SHORE * 2}) scale(1 -1)`}
          opacity="0.4"
          filter="url(#fs-mirror)"
        >
          <path d={NEAR_D} fill="#080E0B" />
          <path d={MID_D} fill="#0A100D" opacity="0.55" />
        </g>
        <rect
          x={HOUSE_X + 9}
          y={SHORE}
          width="38"
          height="104"
          fill="url(#fs-refl)"
          filter="url(#fs-mirror)"
        />
        <rect
          x={HOUSE_X + 56}
          y={SHORE}
          width="17"
          height="52"
          fill="url(#fs-refl)"
          opacity="0.42"
          filter="url(#fs-mirror)"
        />
        {[10, 26, 46, 72, 104, 144, 192].map((dy, i) => (
          <rect
            key={dy}
            x="0"
            y={SHORE + dy}
            width={HW}
            height={1 + (i % 3)}
            fill="#040806"
            opacity={0.4 + i * 0.06}
          />
        ))}
        <rect x="0" y={SHORE} width={HW} height="1.5" fill="rgba(196,208,188,0.16)" />
      </g>

      {/* out-of-focus foreground trunks — the depth cue */}
      <g filter="url(#fs-fore)">
        <path d={`M-20 0L42 0L64 ${HH}L-8 ${HH}Z`} fill="#020403" />
        <path d={`M118 0L146 0L158 ${HH}L112 ${HH}Z`} fill="#030605" opacity="0.9" />
        <path d={`M1466 0L1512 0L1494 ${HH}L1440 ${HH}Z`} fill="#030605" opacity="0.92" />
        <path d={`M1580 0L1640 0L1620 ${HH}L1556 ${HH}Z`} fill="#020403" />
      </g>

      <rect width={HW} height={HH} fill="url(#fs-vig)" />
      <rect width={HW} height={HH} fill="url(#fs-vig-x)" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   CARD ART — same world, small scale, hue shifted per biome
------------------------------------------------------------------ */

const CW = 400;
const CH = 300;
const CSHORE = 222;

type BandSpec = {
  seed: number;
  n: number;
  h: [number, number];
  w: [number, number];
  tiers: number;
  notch: number;
  taper: number;
};

type Biome = {
  sky: [string, string, string];
  far: string;
  near: string;
  water: [string, string];
  fog: string;
  farBand: BandSpec;
  nearBand: BandSpec;
  /** true where the house sits on the near ground rather than behind it */
  houseInFront: boolean;
};

const BIOMES: Record<string, Biome> = {
  /* dense spruce, close and vertical */
  forest: {
    sky: ["#070C0A", "#111C16", "#243328"],
    far: "#1B2822",
    near: "#050908",
    water: ["#0C1512", "#030605"],
    fog: "rgba(180,200,182,0.14)",
    farBand: { seed: 51, n: 30, h: [56, 130], w: [8, 15], tiers: 5, notch: 0.2, taper: 1.05 },
    nearBand: { seed: 67, n: 17, h: [96, 200], w: [12, 24], tiers: 7, notch: 0.16, taper: 1.18 },
    houseInFront: false,
  },
  /* open water and low rock, with a thin line of wind-cut pine */
  coast: {
    sky: ["#060B0C", "#101D1E", "#2A3A39"],
    far: "#16252A",
    near: "#04090A",
    water: ["#0A1416", "#020607"],
    fog: "rgba(184,204,204,0.18)",
    farBand: { seed: 83, n: 9, h: [16, 44], w: [56, 118], tiers: 1, notch: 0, taper: 1.7 },
    nearBand: { seed: 97, n: 11, h: [18, 92], w: [11, 34], tiers: 4, notch: 0.2, taper: 1.35 },
    houseInFront: true,
  },
  /* bare ridges above the treeline */
  highland: {
    sky: ["#080C0C", "#161F1D", "#303C36"],
    far: "#202D2A",
    near: "#070B0A",
    water: ["#0D1413", "#040706"],
    fog: "rgba(206,214,202,0.2)",
    farBand: { seed: 113, n: 5, h: [86, 158], w: [120, 210], tiers: 1, notch: 0, taper: 1.5 },
    nearBand: { seed: 131, n: 7, h: [44, 104], w: [70, 150], tiers: 1, notch: 0, taper: 1.6 },
    houseInFront: true,
  },
};

function cardBand(spec: BandSpec, base: number, gap: boolean): string {
  const trees = stand(spec.seed, spec.n, CW, spec.h[0], spec.h[1], spec.w[0], spec.w[1]);
  return envelope(gap ? trees.filter((t) => Math.abs(t.cx - 252) > 44) : trees, base, CW, {
    step: 2,
    pad: 24,
    drop: 170,
    tiers: spec.tiers,
    notch: spec.notch,
    taper: spec.taper,
  });
}

function CardScene({ id, biome }: { id: string; biome: Biome }) {
  const farD = cardBand(biome.farBand, CSHORE - 8, false);
  const nearD = cardBand(biome.nearBand, CSHORE + 2, !biome.houseInFront);

  const house = (
    <g>
      <ellipse cx="252" cy={CSHORE - 14} rx="70" ry="34" fill={`url(#${id}-glow)`} filter={`url(#${id}-b2)`} />
      <rect x="226" y={CSHORE - 24} width="54" height="24" fill="#060A08" />
      <rect x="220" y={CSHORE - 28} width="66" height="4" fill="#0A100D" />
      <rect x="234" y={CSHORE - 19} width="30" height="10" fill="#F2A65A" />
      <rect x="248" y={CSHORE - 19} width="0.8" height="10" fill="#080B09" opacity="0.7" />
      <rect x="270" y={CSHORE - 18} width="7" height="8" fill="#C2711F" opacity="0.5" />
    </g>
  );

  return (
    <svg
      className={s.mediaFill}
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={biome.sky[0]} />
          <stop offset="52%" stopColor={biome.sky[1]} />
          <stop offset="100%" stopColor={biome.sky[2]} />
        </linearGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={biome.water[0]} />
          <stop offset="100%" stopColor={biome.water[1]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(242,166,90,0.42)" />
          <stop offset="100%" stopColor="rgba(242,166,90,0)" />
        </radialGradient>
        <linearGradient id={`${id}-refl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(242,166,90,0.42)" />
          <stop offset="100%" stopColor="rgba(242,166,90,0)" />
        </linearGradient>
        <linearGradient id={`${id}-vig`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(3,6,5,0.52)" />
          <stop offset="36%" stopColor="rgba(3,6,5,0)" />
          <stop offset="100%" stopColor="rgba(3,6,5,0.6)" />
        </linearGradient>
        <filter id={`${id}-b1`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
        <filter id={`${id}-b2`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <clipPath id={`${id}-lake`}>
          <rect x="0" y={CSHORE} width={CW} height={CH - CSHORE} />
        </clipPath>
      </defs>

      <rect width={CW} height={CH} fill={`url(#${id}-sky)`} />
      <path d={farD} fill={biome.far} opacity="0.62" filter={`url(#${id}-b1)`} />
      <g filter={`url(#${id}-b2)`}>
        <ellipse cx="200" cy={CSHORE - 34} rx="250" ry="22" fill={biome.fog} />
      </g>

      {biome.houseInFront ? null : house}
      <path d={nearD} fill={biome.near} />
      {biome.houseInFront ? house : null}

      <rect x="0" y={CSHORE} width={CW} height={CH - CSHORE} fill={`url(#${id}-water)`} />
      <g clipPath={`url(#${id}-lake)`}>
        <g transform={`translate(0 ${CSHORE * 2}) scale(1 -1)`} opacity="0.34" filter={`url(#${id}-b1)`}>
          <path d={nearD} fill="#070C0A" />
        </g>
        <rect x="238" y={CSHORE} width="15" height="52" fill={`url(#${id}-refl)`} filter={`url(#${id}-b1)`} />
        {[5, 14, 27, 44, 64].map((dy, i) => (
          <rect key={dy} x="0" y={CSHORE + dy} width={CW} height="1" fill="#040806" opacity={0.42 + i * 0.08} />
        ))}
        <rect x="0" y={CSHORE} width={CW} height="1" fill="rgba(196,208,188,0.18)" />
      </g>
      <rect width={CW} height={CH} fill={`url(#${id}-vig)`} />
    </svg>
  );
}

/* ------------------------------------------------------------------
   INSTRUMENTS — five metrics, five different readout devices
------------------------------------------------------------------ */

const DV_W = 300;
const DV_H = 40;

/** 01 — distance rule with a needle. */
function RuleDevice({ value, max }: { value: number; max: number }) {
  const x = (value / max) * DV_W;
  return (
    <svg viewBox={`0 0 ${DV_W} ${DV_H}`} className={s.device} aria-hidden="true" focusable="false">
      <line x1="0" y1="28" x2={DV_W} y2="28" stroke="rgba(169,183,155,0.24)" strokeWidth="1" />
      {Array.from({ length: 31 }, (_, i) => (
        <line
          key={i}
          x1={i * 10}
          y1={28}
          x2={i * 10}
          y2={i % 5 === 0 ? 18 : 23}
          stroke="rgba(169,183,155,0.34)"
          strokeWidth="1"
        />
      ))}
      <line x1={x} y1="6" x2={x} y2="34" stroke="#F2A65A" strokeWidth="1.6" />
      <path d={`M${x - 4} 2L${x + 4} 2L${x} 8Z`} fill="#F2A65A" />
    </svg>
  );
}

/** 02 — ambient level: four nights of samples under a threshold line. */
const DB_BARS = Array.from({ length: 44 }, (_, i) => {
  const a = hash(i * 7 + 5);
  const b = hash(i * 19 + 31);
  return 4 + a * 12 + (b > 0.88 ? 9 : 0);
});

function LevelDevice() {
  return (
    <svg viewBox={`0 0 ${DV_W} ${DV_H}`} className={s.device} aria-hidden="true" focusable="false">
      <line
        x1="0"
        y1="8"
        x2={DV_W}
        y2="8"
        stroke="rgba(169,183,155,0.22)"
        strokeWidth="1"
        strokeDasharray="2 5"
      />
      {DB_BARS.map((h, i) => (
        <rect
          key={i}
          x={i * 6.8}
          y={34 - h}
          width="2.6"
          height={h}
          fill={h > 17 ? "#F2A65A" : "rgba(169,183,155,0.55)"}
        />
      ))}
      <line x1="0" y1="35" x2={DV_W} y2="35" stroke="rgba(169,183,155,0.24)" strokeWidth="1" />
    </svg>
  );
}

/** 03 — signal staircase, struck out. "None" is the reading we want. */
function SignalDevice() {
  return (
    <svg viewBox={`0 0 ${DV_W} ${DV_H}`} className={s.device} aria-hidden="true" focusable="false">
      {/* five steps of strength, none of them reached */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={i * 26}
          y={34 - (i + 1) * 6}
          width="15"
          height={(i + 1) * 6}
          fill="none"
          stroke="rgba(169,183,155,0.42)"
          strokeWidth="1"
        />
      ))}
      <line x1="0" y1="35" x2={DV_W} y2="35" stroke="rgba(169,183,155,0.24)" strokeWidth="1" />
      {/* the reading sits on the floor, and that is the point */}
      <line x1="0" y1="35" x2="130" y2="35" stroke="#F2A65A" strokeWidth="2" />
      <text x="146" y="30" className={s.deviceText}>
        no relay in range
      </text>
    </svg>
  );
}

/** 04 — the Bortle strip, nine cells, ours ringed. */
const STARS = Array.from({ length: 34 }, (_, i) => ({
  x: hash(i * 3 + 91) * 96,
  y: 3 + hash(i * 11 + 17) * 24,
  r: 0.4 + hash(i * 23 + 5) * 0.85,
}));

function SkyDevice({ bortle }: { bortle: number }) {
  const cw = DV_W / 9;
  return (
    <svg viewBox={`0 0 ${DV_W} ${DV_H}`} className={s.device} aria-hidden="true" focusable="false">
      {Array.from({ length: 9 }, (_, i) => {
        const v = Math.round(6 + (i / 8) * 96);
        return (
          <rect key={i} x={i * cw} y="2" width={cw - 1.6} height="28" fill={`rgb(${v} ${v + 7} ${v + 3})`} />
        );
      })}
      <g fill="rgba(233,237,225,0.9)">
        {STARS.map((st, i) => (
          <circle key={i} cx={st.x} cy={st.y} r={st.r} />
        ))}
      </g>
      <rect
        x={(bortle - 1) * cw - 1.5}
        y="0.5"
        width={cw + 1.4}
        height="31"
        fill="none"
        stroke="#F2A65A"
        strokeWidth="1.4"
      />
      <line x1="0" y1="35" x2={DV_W} y2="35" stroke="rgba(169,183,155,0.24)" strokeWidth="1" />
    </svg>
  );
}

/** 05 — the specimen itself, drawn at scale, pressed onto the page. */
function SpecimenDevice() {
  return (
    <svg viewBox={`0 0 ${DV_W} ${DV_H}`} className={s.device} aria-hidden="true" focusable="false">
      <path
        d={envelope([{ cx: 17, h: 31, w: 12 }], 34, 34, {
          step: 1,
          pad: 0,
          drop: 0,
          tiers: 6,
          notch: 0.22,
          taper: 1.2,
        })}
        fill="rgba(169,183,155,0.6)"
      />
      <path
        d={envelope([{ cx: 46, h: 22, w: 9 }], 34, 60, {
          step: 1,
          pad: 0,
          drop: 0,
          tiers: 5,
          notch: 0.22,
          taper: 1.2,
        })}
        fill="rgba(169,183,155,0.32)"
      />
      <line x1="0" y1="35" x2={DV_W} y2="35" stroke="rgba(169,183,155,0.24)" strokeWidth="1" />
      <text x="66" y="16" className={s.deviceText}>
        picea abies · granite · standing water
      </text>
      <text x="66" y="29" className={s.deviceText}>
        canopy 31 m · unlogged since 1804
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------
   CONTENT
------------------------------------------------------------------ */

const STATION = {
  spec: "SPEC. 04",
  name: "Sparv 04",
  region: "Rogen Reserve, Sweden",
  coord: "62°19′N 12°26′E",
  alt: "742 m",
  surveyed: "04.11.26 · 05:12 local",
  surveyor: "K. Røed · on site · four nights",
};

const METRICS = [
  {
    n: "01",
    label: "Solitude",
    value: "34",
    unit: "km",
    word: false,
    note: "Straight-line distance to the nearest permanent dwelling. It is a shuttered forestry hut, and nobody has wintered in it since 2011.",
    device: <RuleDevice value={34} max={60} />,
    scale: ["0", "60 km"],
  },
  {
    n: "02",
    label: "Silence",
    value: "32",
    unit: "dB",
    word: false,
    note: "Ambient floor at 03:00, averaged over four nights. Low enough that you will hear your own pulse before you hear the forest.",
    device: <LevelDevice />,
    scale: ["quiet", "four nights sampled"],
  },
  {
    n: "03",
    label: "Signal",
    value: "None",
    unit: "",
    word: true,
    note: "No cellular, no broadband, no line of sight to a mast. A satellite handset sits in the drawer. It has never been used.",
    device: <SignalDevice />,
    scale: ["none", "full"],
  },
  {
    n: "04",
    label: "Dark sky",
    value: "2",
    unit: "bortle",
    word: false,
    note: "Light pollution measured at zenith. At Bortle 2 the Milky Way is bright enough to cast a shadow on fresh snow.",
    device: <SkyDevice bortle={2} />,
    scale: ["1 pristine", "9 city"],
  },
  {
    n: "05",
    label: "Biome",
    value: "Forest",
    unit: "",
    word: true,
    note: "Old spruce on granite, with black standing water on three sides. The road stops nine kilometres short of the door.",
    device: <SpecimenDevice />,
    scale: ["specimen", "pressed 04.11.26"],
  },
] as const;

const METHOD = [
  {
    n: "01",
    title: "Walked in",
    body: "A surveyor reaches the house the way a guest will: on foot, on skis, or not at all. If the last kilometre is easy, the house is usually wrong.",
  },
  {
    n: "02",
    title: "Four nights measured",
    body: "Sound at 03:00, sky at zenith, signal at the door and at the ridge. Distance is walked and confirmed, never taken from a map.",
  },
  {
    n: "03",
    title: "Listed, or refused",
    body: "Ordinary numbers mean no listing — however good the architecture is. Nine houses out of ten never make the register.",
  },
] as const;

const HOUSES = [
  {
    spec: "SPEC. 07",
    name: "Tarn 07",
    biome: "forest",
    place: "Petkeljärvi Shield, FI",
    coord: "62°45′N 30°58′E",
    copy: "Black timber on a granite shelf above a tarn that never fully thaws. The track gives up nine kilometres early; the rest is walked.",
    rows: [
      ["Solitude", "22 km"],
      ["Silence", "34 dB"],
      ["Signal", "Weak"],
      ["Dark sky", "Bortle 3"],
    ],
    rate: "€290",
  },
  {
    spec: "SPEC. 02",
    name: "Skerry 02",
    biome: "coast",
    place: "Vesterålen, NO",
    coord: "68°58′N 15°12′E",
    copy: "One room anchored to black rock above open water. Out here the wind is the only thing that arrives without asking first.",
    rows: [
      ["Solitude", "19 km"],
      ["Silence", "38 dB"],
      ["Signal", "None"],
      ["Dark sky", "Bortle 3"],
    ],
    rate: "€315",
  },
  {
    spec: "SPEC. 11",
    name: "Kolm 11",
    biome: "highland",
    place: "Kebnekaise South, SE",
    coord: "67°42′N 18°31′E",
    copy: "A concrete shelf pressed under six months of winter. Reached on skis from February, or reached by nobody at all.",
    rows: [
      ["Solitude", "41 km"],
      ["Silence", "26 dB"],
      ["Signal", "None"],
      ["Dark sky", "Bortle 1"],
    ],
    rate: "€340",
  },
] as const;

const NAV = ["Register", "Method", "Field notes", "Enquire"];

/* ------------------------------------------------------------------
   PAGE
------------------------------------------------------------------ */

export default function FieldStation() {
  return (
    <main className={`${serif.variable} ${sans.variable} ${mono.variable} ${s.page}`}>
      {/* paper grain — material, not glow */}
      <svg className={s.grain} aria-hidden="true" focusable="false">
        <filter id="fs-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fs-grain)" />
      </svg>

      {/* ============================ HERO ============================ */}
      <section className={s.hero}>
        {/* MEDIA SLOT — swap the <svg> for <img>/<video class="mediaFill">.
            The scrim stays: it is what keeps the type legible over any
            frame of a moving picture. */}
        <div className={s.media}>
          <HeroScene />
          <div className={s.scrim} aria-hidden="true" />
        </div>

        <header className={s.nav}>
          <a href="#station" className={s.wordmark}>
            Stillnest
          </a>
          <nav className={s.navLinks} aria-label="Primary">
            {NAV.map((item) => (
              <a key={item} href="#station" className={s.navLink}>
                {item}
              </a>
            ))}
          </nav>
          <a href="#station" className={s.navBtn}>
            Reserve a night
          </a>
        </header>

        <div className={s.heroBody}>
          <div className={s.rail}>
            <span className={s.railText}>§01 &nbsp;Station &nbsp;/&nbsp; Rogen Reserve</span>
            <span className={s.railRule} aria-hidden="true" />
          </div>

          <div className={s.heroCopy}>
            <p className={s.eyebrow}>
              <span className={s.live} aria-hidden="true" />
              Station online · 04.11.26 · 05:12 local · −6&nbsp;°C · still
            </p>

            <h1 className={s.h1}>
              Nowhere.
              <span className={s.h1b}>On purpose.</span>
            </h1>

            <p className={s.lede}>
              Twelve houses, each surveyed on foot before it was listed. We publish the
              distance, the decibels and the dark. We have never once published a bedroom
              count.
            </p>

            <div className={s.actions}>
              <a href="#survey" className={s.btn}>
                Read the survey
                <span className={s.btnArrow} aria-hidden="true">
                  →
                </span>
              </a>
              <a href="#register" className={s.btnGhost}>
                Twelve in the register
              </a>
            </div>
          </div>

          <dl className={s.heroFacts}>
            <div className={s.fact}>
              <dt>In the register</dt>
              <dd>12</dd>
            </div>
            <div className={s.fact}>
              <dt>Biomes</dt>
              <dd>6</dd>
            </div>
            <div className={s.fact}>
              <dt>Minimum stay</dt>
              <dd>
                3<span>nights</span>
              </dd>
            </div>
            <div className={s.fact}>
              <dt>Neighbours</dt>
              <dd className={s.factLit}>0</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* =========================== SURVEY =========================== */}
      <section className={`${s.section} ${s.survey}`} id="survey">
        <div className={s.rail}>
          <span className={s.railText}>§02 &nbsp;Survey sheet &nbsp;/&nbsp; 41 pages</span>
          <span className={s.railRule} aria-hidden="true" />
        </div>

        <div className={s.sectionBody}>
          {/* ------- THE SHEET: half inside the photograph ------- */}
          <article className={s.sheet} id="station">
            <span className={`${s.reg} ${s.regTL}`} aria-hidden="true" />
            <span className={`${s.reg} ${s.regTR}`} aria-hidden="true" />
            <span className={`${s.reg} ${s.regBL}`} aria-hidden="true" />
            <span className={`${s.reg} ${s.regBR}`} aria-hidden="true" />

            <header className={s.sheetHead}>
              <div className={s.sheetId}>
                <span className={s.spec}>{STATION.spec}</span>
                <h2 className={s.sheetName}>{STATION.name}</h2>
                <p className={s.sheetPlace}>
                  {STATION.region} <span className={s.dot}>·</span> {STATION.coord}{" "}
                  <span className={s.dot}>·</span> {STATION.alt}
                </p>
              </div>
              <div className={s.sheetMeta}>
                <p>Surveyed {STATION.surveyed}</p>
                <p>{STATION.surveyor}</p>
                <p className={s.sheetMetaLit}>Solitude index 94 / 100</p>
              </div>
            </header>

            <div className={s.grid}>
              {METRICS.map((m) => (
                <div key={m.n} className={s.cell}>
                  <div className={s.cellHead}>
                    <span className={s.cellLabel}>{m.label}</span>
                    <span className={s.cellN}>{m.n}/05</span>
                  </div>

                  <p className={`${s.cellValue} ${m.word ? s.cellWord : ""}`}>
                    {m.value}
                    {m.unit ? <span className={s.cellUnit}>{m.unit}</span> : null}
                  </p>

                  <div className={s.cellDevice}>
                    {m.device}
                    <div className={s.cellScale}>
                      <span>{m.scale[0]}</span>
                      <span>{m.scale[1]}</span>
                    </div>
                  </div>

                  <p className={s.cellNote}>{m.note}</p>
                </div>
              ))}
            </div>

            <footer className={s.sheetFoot}>
              <p>
                Full survey, 41 pages, released on enquiry. Every figure above was taken on
                site, at night, by one person who stayed there.
              </p>
              <a href="#register" className={s.sheetLink}>
                Open the survey <span aria-hidden="true">→</span>
              </a>
            </footer>
          </article>

          {/* ---------------------- method ---------------------- */}
          <div className={s.method}>
            <div className={s.methodIntro}>
              <h3 className={s.methodTitle}>
                We never list the bedrooms.
                <em> We list the distance.</em>
              </h3>
              <p className={s.methodCopy}>
                A house enters the register only after four nights of measurement. Five
                readings, no adjectives, one surveyor who sleeps there.
              </p>
            </div>

            <ol className={s.steps}>
              {METHOD.map((m) => (
                <li key={m.n} className={s.step}>
                  <span className={s.stepN}>{m.n}</span>
                  <div>
                    <h4 className={s.stepTitle}>{m.title}</h4>
                    <p className={s.stepBody}>{m.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ========================== REGISTER ========================== */}
      <section className={s.section} id="register">
        <div className={s.rail}>
          <span className={s.railText}>§03 &nbsp;Register &nbsp;/&nbsp; three of twelve</span>
          <span className={s.railRule} aria-hidden="true" />
        </div>

        <div className={s.sectionBody}>
          <header className={s.regHead}>
            <h2 className={s.h2}>Unoccupied tonight.</h2>
            <p className={s.regNote}>
              Ranked by distance, never by view. We keep twelve houses and we do not intend
              to keep thirteen.
            </p>
          </header>

          <ul className={s.cards}>
            {HOUSES.map((h) => (
              <li key={h.spec} className={s.card}>
                <a href="#station" className={s.cardLink}>
                  <div className={s.cardArt}>
                    <CardScene id={`fs-${h.biome}`} biome={BIOMES[h.biome]} />
                    <span className={s.cardBiome}>{h.biome}</span>
                    <span className={s.cardSpec}>{h.spec}</span>
                  </div>

                  <div className={s.cardBody}>
                    <h3 className={s.cardName}>{h.name}</h3>
                    <p className={s.cardPlace}>
                      {h.place} <span className={s.dot}>·</span> {h.coord}
                    </p>
                    <p className={s.cardCopy}>{h.copy}</p>

                    <dl className={s.cardRows}>
                      {h.rows.map(([k, v]) => (
                        <div key={k} className={s.cardRow}>
                          <dt>{k}</dt>
                          <dd className={v === "None" ? s.factLit : undefined}>{v}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className={s.cardRate}>
                      {h.rate} <span>/ night</span>
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* =========================== COLOPHON ========================== */}
      <footer className={`${s.section} ${s.colophon}`}>
        <div className={s.rail}>
          <span className={s.railText}>§04 &nbsp;Colophon</span>
          <span className={s.railRule} aria-hidden="true" />
        </div>
        <div className={s.sectionBody}>
          <div className={s.foot}>
            <p className={s.footMark}>
              Stillnest <span>— Nowhere. On purpose.</span>
            </p>
            <p className={s.footNote}>
              Concept project. Houses, coordinates and survey figures are fictional and
              cannot be booked. Enquiries are answered by a person, within a day, from a
              place that has signal.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
