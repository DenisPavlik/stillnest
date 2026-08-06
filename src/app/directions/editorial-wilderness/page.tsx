import type { Metadata } from "next";
import type { ReactElement } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";

import styles from "./page.module.css";

/* -------------------------------------------------------------------------
   Typography — an editorial serif for the voice, a quiet sans for the prose,
   a mono for anything that was *measured* rather than written.
   ---------------------------------------------------------------------- */

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--ew-display",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ew-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ew-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stillnest — Nowhere. On purpose.",
  description:
    "Direction 02: Editorial Wilderness. A printed journal for houses measured by how far away everyone else is.",
};

/* -------------------------------------------------------------------------
   Geometry helpers — every landscape on this page is generated, not photographed.
   ---------------------------------------------------------------------- */

function ridge(
  fn: (x: number) => number,
  width: number,
  bottom: number,
  step = 12,
): string {
  const points: string[] = [];
  for (let x = 0; x <= width; x += step) {
    points.push(`${x},${fn(x).toFixed(1)}`);
  }
  points.push(`${width},${fn(width).toFixed(1)}`);
  return `M${points.join(" L")} L${width},${bottom} L0,${bottom} Z`;
}

function Grain({ id, frequency = 0.82 }: { id: string; frequency?: number }) {
  return (
    <filter id={id} x="0%" y="0%" width="100%" height="100%">
      <feTurbulence
        type="fractalNoise"
        baseFrequency={frequency}
        numOctaves={4}
        stitchTiles="stitch"
      />
      <feColorMatrix type="saturate" values="0" />
    </filter>
  );
}

/* ---------------------------------------------------- Fig. 01 — the lake */

function LakePlate() {
  const far = (x: number) =>
    424 - 34 * Math.sin(x / 265) - 17 * Math.sin(x / 97 + 1.3) - 11 * Math.cos(x / 430);
  const mid = (x: number) =>
    486 - 21 * Math.sin(x / 182 + 2.1) - 10 * Math.cos(x / 71) - 5 * Math.sin(x / 39);

  const trees: { x: number; y: number; h: number; w: number }[] = [];
  for (let x = 18; x < 1600; x += 9.5) {
    const h =
      9 +
      11 * Math.abs(Math.sin(x / 31)) +
      7 * Math.abs(Math.cos(x / 113 + 0.7)) +
      4 * Math.abs(Math.sin(x / 17));
    trees.push({ x, y: mid(x) + 6, h, w: h * (0.24 + 0.14 * Math.abs(Math.cos(x / 23))) });
  }

  const islandTrees = [268, 292, 316, 344, 372, 398, 424].map((x, i) => ({
    x,
    y: 516,
    h: 15 + 7 * Math.abs(Math.sin(i * 1.9)),
  }));

  return (
    <svg
      viewBox="0 0 1600 840"
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
      focusable="false"
    >
      <defs>
        <linearGradient id="lakeSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c6bfab" />
          <stop offset="46%" stopColor="#dad3c2" />
          <stop offset="88%" stopColor="#ece7d9" />
          <stop offset="100%" stopColor="#f0ebde" />
        </linearGradient>
        <radialGradient id="lakeSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fffdf7" stopOpacity="1" />
          <stop offset="30%" stopColor="#fbf6ea" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#f7f1e3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lakeWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b0a897" />
          <stop offset="22%" stopColor="#a9a190" />
          <stop offset="100%" stopColor="#867e6d" />
        </linearGradient>
        <linearGradient id="lakePath" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efe9db" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#efe9db" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lakeMist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2ede1" stopOpacity="0" />
          <stop offset="55%" stopColor="#f2ede1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f2ede1" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lakeGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#b8683f" stopOpacity="0.62" />
          <stop offset="100%" stopColor="#b8683f" stopOpacity="0" />
        </radialGradient>
        <filter id="lakeSoft" x="-8%" y="-40%" width="116%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="lakeSofter" x="-8%" y="-40%" width="116%" height="200%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="lakeBloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="34" />
        </filter>
        <clipPath id="lakeWaterClip">
          <rect x="0" y="522" width="1600" height="318" />
        </clipPath>
        <Grain id="lakeGrain" frequency={0.72} />
      </defs>

      <rect x="0" y="0" width="1600" height="524" fill="url(#lakeSky)" />
      <ellipse cx="1188" cy="446" rx="290" ry="176" fill="url(#lakeSun)" />

      <path d={ridge(far, 1600, 528)} fill="#b5ad99" filter="url(#lakeSoft)" />
      <path d={ridge(mid, 1600, 528)} fill="#8d8570" />

      <g fill="#5b5443">
        <path
          d={ridge((x) => mid(x) + 2, 1600, 528)}
          fill="none"
          stroke="#5b5443"
          strokeWidth="7"
        />
        {trees.map((t) => (
          <path
            key={t.x}
            d={`M${t.x.toFixed(1)},${(t.y - t.h).toFixed(1)} L${(t.x + t.w).toFixed(1)},${t.y.toFixed(1)} L${(t.x - t.w).toFixed(1)},${t.y.toFixed(1)} Z`}
          />
        ))}
      </g>

      <rect x="0" y="440" width="1600" height="118" fill="url(#lakeMist)" />

      <rect x="0" y="522" width="1600" height="318" fill="url(#lakeWater)" />
      <g clipPath="url(#lakeWaterClip)">
        <path
          d="M1078,516 L1300,516 L1560,840 L840,840 Z"
          fill="url(#lakePath)"
          opacity="0.75"
          filter="url(#lakeBloom)"
        />
      </g>

      {/* the island — and the one lit window, thirty-four kilometres from the next */}
      <g>
        <ellipse cx="352" cy="512" rx="150" ry="52" fill="url(#lakeGlow)" />
        <g fill="#3d3729">
          {islandTrees.map((t) => (
            <path
              key={t.x}
              d={`M${t.x},${t.y - t.h} L${t.x + t.h * 0.3},${t.y} L${t.x - t.h * 0.3},${t.y} Z`}
            />
          ))}
        </g>
        <path
          d="M236,522 C 268,510 300,506 352,505 C 404,504 442,509 468,522 Z"
          fill="#3d3729"
        />
        <rect x="304" y="497" width="58" height="21" fill="#f2eee2" />
        <rect x="304" y="497" width="58" height="3" fill="#2c2820" />
        <rect x="322" y="503" width="17" height="10" fill="#b0603c" />
      </g>

      <g clipPath="url(#lakeWaterClip)">
        <path
          d={ridge(mid, 1600, 528)}
          fill="#5b5443"
          opacity="0.3"
          filter="url(#lakeSofter)"
          transform="matrix(1,0,0,-1,0,1050)"
        />
        <rect x="318" y="524" width="26" height="7" fill="#b0603c" opacity="0.55" />
        <rect x="322" y="536" width="18" height="4" fill="#b0603c" opacity="0.3" />
        <rect x="325" y="547" width="12" height="3" fill="#b0603c" opacity="0.18" />
        <g fill="#f0ece2">
          <rect x="0" y="540" width="1600" height="2" opacity="0.26" />
          <rect x="120" y="578" width="1360" height="2" opacity="0.18" />
          <rect x="0" y="632" width="980" height="2.5" opacity="0.15" />
          <rect x="520" y="708" width="1080" height="3" opacity="0.13" />
          <rect x="60" y="788" width="820" height="3" opacity="0.1" />
        </g>
      </g>
      <rect x="0" y="521" width="1600" height="1.4" fill="#6f6858" opacity="0.6" />

      <rect
        x="0"
        y="0"
        width="1600"
        height="840"
        filter="url(#lakeGrain)"
        opacity="0.17"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------- biome card plates */

function SnowPlate() {
  const peaks = (x: number) =>
    398 - 52 * Math.abs(Math.sin(x / 118)) - 20 * Math.sin(x / 44 + 0.6);

  return (
    <svg viewBox="0 0 640 800" role="presentation" focusable="false">
      <defs>
        <linearGradient id="snowSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dcd8cd" />
          <stop offset="70%" stopColor="#ebe7dd" />
          <stop offset="100%" stopColor="#f4f1e9" />
        </linearGradient>
        <linearGradient id="snowField" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6f3ec" />
          <stop offset="46%" stopColor="#e6e0d1" />
          <stop offset="100%" stopColor="#cdc5b1" />
        </linearGradient>
        <radialGradient id="snowSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fdfbf4" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fdfbf4" stopOpacity="0" />
        </radialGradient>
        <filter id="snowSoft" x="-10%" y="-40%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="snowDrift" x="-10%" y="-40%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <Grain id="snowGrain" frequency={0.9} />
      </defs>

      <rect x="0" y="0" width="640" height="480" fill="url(#snowSky)" />
      <ellipse cx="452" cy="330" rx="215" ry="165" fill="url(#snowSun)" />
      <path d={ridge(peaks, 640, 486)} fill="#b6b0a0" filter="url(#snowSoft)" />
      <path
        d={ridge(
          (x) => 448 - 26 * Math.abs(Math.sin(x / 96 + 1.4)) - 9 * Math.sin(x / 38),
          640,
          486,
        )}
        fill="#9a9380"
      />
      <path
        d={ridge((x) => 472 - 10 * Math.sin(x / 150 + 2), 640, 490)}
        fill="#847d6a"
      />

      <rect x="0" y="478" width="640" height="322" fill="url(#snowField)" />

      {/* wind-carved drifts — shadow lines only, the snow keeps its light */}
      <g stroke="#a79e87" fill="none" filter="url(#snowSoft)">
        <path d="M0,514 C 170,504 330,522 640,508" strokeWidth="2.5" opacity="0.42" />
        <path d="M0,556 C 200,542 380,566 640,548" strokeWidth="3" opacity="0.34" />
        <path d="M0,624 C 220,604 420,636 640,612" strokeWidth="4" opacity="0.28" />
        <path d="M0,712 C 240,688 440,726 640,698" strokeWidth="5" opacity="0.22" />
      </g>
      <path
        d={ridge((x) => 654 - 26 * Math.sin(x / 210 + 0.9), 640, 800)}
        fill="#b9b19b"
        opacity="0.22"
        filter="url(#snowDrift)"
      />

      <g>
        <path d="M352,492 L286,492 L196,510 L330,510 Z" fill="#8d846d" opacity="0.5" />
        <rect x="286" y="472" width="66" height="20" fill="#2c2820" />
        <rect x="286" y="472" width="66" height="3" fill="#f6f3ec" opacity="0.55" />
        <rect x="299" y="479" width="14" height="8" fill="#b0603c" />
      </g>

      <rect
        x="0"
        y="0"
        width="640"
        height="800"
        filter="url(#snowGrain)"
        opacity="0.15"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

function DesertPlate() {
  const d1 = (x: number) => 412 - 30 * Math.sin(x / 152 + 0.4);
  const d2 = (x: number) => 508 - 44 * Math.sin(x / 118 + 1.5);
  const d3 = (x: number) => 622 - 44 * Math.sin(x / 96 + 3.4);
  const d4 = (x: number) => 736 - 40 * Math.sin(x / 130 + 5.2);

  return (
    <svg viewBox="0 0 640 800" role="presentation" focusable="false">
      <defs>
        <linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0d6c0" />
          <stop offset="62%" stopColor="#eee6d6" />
          <stop offset="100%" stopColor="#f6f0e3" />
        </linearGradient>
        <radialGradient id="dSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fbf6ea" stopOpacity="1" />
          <stop offset="46%" stopColor="#f7efdd" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f7efdd" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a99a7c" />
          <stop offset="100%" stopColor="#8d8168" />
        </linearGradient>
        <filter id="dSoft" x="-10%" y="-40%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <Grain id="dGrain" frequency={0.86} />
      </defs>

      <rect x="0" y="0" width="640" height="440" fill="url(#dSky)" />
      <ellipse cx="392" cy="352" rx="250" ry="230" fill="url(#dSun)" />
      <circle cx="392" cy="352" r="46" fill="#fcf8ee" opacity="0.85" />

      <path d={ridge(d1, 640, 800)} fill="#ddd2b9" filter="url(#dSoft)" />
      <path d={ridge(d2, 640, 800)} fill="#cabd9e" />
      <path d={ridge((x) => d2(x) + 20, 640, 800)} fill="#bcae8c" opacity="0.5" />

      {/* the house, on the second crest */}
      <g>
        <path d="M452,466 L486,466 L534,478 L452,478 Z" fill="#7d7159" opacity="0.3" />
        <rect x="452" y="444" width="34" height="22" fill="#f2ede0" />
        <rect x="452" y="444" width="34" height="3" fill="#4a4234" />
        <rect x="458" y="452" width="14" height="6" fill="#b0603c" />
      </g>

      <path d={ridge(d3, 640, 800)} fill="#ad9f81" />
      <path d={ridge((x) => d3(x) + 26, 640, 800)} fill="#a1936f" opacity="0.4" />
      <path d={ridge(d4, 640, 800)} fill="url(#dNear)" />

      <g stroke="#f6f0e3" fill="none" strokeWidth="2" filter="url(#dSoft)">
        <path d="M0,478 C 160,468 300,486 640,470" opacity="0.3" />
        <path d="M0,592 C 200,578 380,600 640,584" opacity="0.22" />
      </g>

      <rect
        x="0"
        y="0"
        width="640"
        height="800"
        filter="url(#dGrain)"
        opacity="0.17"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

function CoastPlate() {
  return (
    <svg viewBox="0 0 640 800" role="presentation" focusable="false">
      <defs>
        <linearGradient id="cSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8d4c7" />
          <stop offset="68%" stopColor="#e9e5db" />
          <stop offset="100%" stopColor="#f3efe6" />
        </linearGradient>
        <linearGradient id="cSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c0b9a7" />
          <stop offset="30%" stopColor="#b0a897" />
          <stop offset="100%" stopColor="#8e8675" />
        </linearGradient>
        <linearGradient id="cFore" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6e1d3" />
          <stop offset="100%" stopColor="#c6bfad" />
        </linearGradient>
        <radialGradient id="cHaze" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fbf8f0" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fbf8f0" stopOpacity="0" />
        </radialGradient>
        <filter id="cSoft" x="-10%" y="-40%" width="120%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <Grain id="cGrain" frequency={0.88} />
      </defs>

      <rect x="0" y="0" width="640" height="440" fill="url(#cSky)" />
      <ellipse cx="210" cy="410" rx="300" ry="150" fill="url(#cHaze)" />

      {/* a far island, then the cliff the house stands on */}
      <path
        d="M0,438 C 46,430 92,424 140,428 C 178,432 206,438 236,442 L236,462 L0,462 Z"
        fill="#a49c88"
        opacity="0.75"
        filter="url(#cSoft)"
      />
      <path
        d="M640,392 C 600,396 566,404 534,416 C 496,430 462,446 424,458 L640,458 Z"
        fill="#8a8370"
        filter="url(#cSoft)"
      />
      <path
        d="M640,414 C 608,418 578,426 550,438 C 518,452 490,458 462,460 L640,460 Z"
        fill="#544d3d"
      />
      <g>
        <rect x="546" y="418" width="44" height="16" fill="#f2ede1" />
        <rect x="546" y="418" width="44" height="3" fill="#2e2a22" />
        <rect x="556" y="424" width="13" height="7" fill="#b0603c" />
      </g>

      <rect x="0" y="459" width="640" height="341" fill="url(#cSea)" />
      <rect x="0" y="458" width="640" height="1.5" fill="#5f5847" opacity="0.6" />
      <g stroke="#f2eee5" fill="none" filter="url(#cSoft)">
        <path d="M0,468 C 200,463 420,473 640,466" strokeWidth="2" opacity="0.45" />
        <path d="M0,486 C 190,479 400,492 640,483" strokeWidth="2.5" opacity="0.36" />
        <path d="M0,514 C 230,504 420,522 640,509" strokeWidth="3" opacity="0.3" />
        <path d="M0,556 C 200,543 430,566 640,550" strokeWidth="3.5" opacity="0.24" />
        <path d="M0,612 C 220,596 420,624 640,604" strokeWidth="4.5" opacity="0.2" />
      </g>
      <rect x="542" y="461" width="13" height="30" fill="#b0603c" opacity="0.45" />
      <rect x="545" y="496" width="8" height="12" fill="#b0603c" opacity="0.22" />

      <path
        d="M0,692 C 180,666 360,706 640,678 L640,800 L0,800 Z"
        fill="url(#cFore)"
      />
      <path
        d="M0,692 C 180,666 360,706 640,678 L640,690 C 360,718 180,678 0,704 Z"
        fill="#fbf9f3"
        opacity="0.9"
      />
      <path
        d="M0,742 C 200,722 400,758 640,732"
        stroke="#f5f2e9"
        strokeWidth="2.5"
        fill="none"
        opacity="0.55"
        filter="url(#cSoft)"
      />
      <path
        d="M0,776 C 220,760 420,788 640,766"
        stroke="#b3ab98"
        strokeWidth="2"
        fill="none"
        opacity="0.35"
        filter="url(#cSoft)"
      />

      <rect
        x="0"
        y="0"
        width="640"
        height="800"
        filter="url(#cGrain)"
        opacity="0.16"
        style={{ mixBlendMode: "multiply" }}
      />
    </svg>
  );
}

/* ------------------------------------------------------- the printed ruler */

type Scale =
  | {
      kind: "continuous";
      min: string;
      max: string;
      ticks: number;
      major: number;
      percent: number;
    }
  | { kind: "discrete"; stops: string[]; active: number };

function Ruler({ scale }: { scale: Scale }) {
  if (scale.kind === "continuous") {
    return (
      <div className={styles.ruler}>
        <div className={styles.track}>
          {Array.from({ length: scale.ticks }, (_, i) => (
            <span
              key={i}
              className={`${styles.tick} ${i % scale.major === 0 ? styles.tickMajor : ""}`}
            />
          ))}
          <span className={styles.caret} style={{ left: `${scale.percent}%` }} />
        </div>
        <div className={styles.scaleEnds}>
          <span>{scale.min}</span>
          <span>{scale.max}</span>
        </div>
      </div>
    );
  }

  const last = scale.stops.length - 1;

  return (
    <div className={styles.ruler}>
      <div className={styles.track}>
        {scale.stops.map((stop) => (
          <span key={stop} className={`${styles.tick} ${styles.tickMajor}`} />
        ))}
        <span
          className={styles.caret}
          style={{ left: `${(scale.active / last) * 100}%` }}
        />
      </div>
      <div className={styles.stops}>
        {scale.stops.map((stop, i) => (
          <span
            key={stop}
            className={i === scale.active ? styles.stopOn : undefined}
            style={{
              left: `${(i / last) * 100}%`,
              transform:
                i === 0
                  ? "none"
                  : i === last
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            {stop}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- data */

const readings: {
  metric: string;
  value: string;
  unit?: string;
  word?: boolean;
  scale: Scale;
  note: string;
  emphasis: string;
}[] = [
  {
    metric: "Solitude",
    value: "34",
    unit: "km",
    scale: {
      kind: "continuous",
      min: "0 km",
      max: "60 km",
      ticks: 25,
      major: 4,
      percent: 56.7,
    },
    note: "Straight-line distance to the nearest permanent dwelling.",
    emphasis: "Nobody arrives here by accident.",
  },
  {
    metric: "Silence",
    value: "32",
    unit: "dB",
    scale: {
      kind: "continuous",
      min: "15 dB",
      max: "60 dB",
      ticks: 25,
      major: 4,
      percent: 37.8,
    },
    note: "Ambient floor at 04:00, taken one metre from the door.",
    emphasis: "You will hear yourself breathing.",
  },
  {
    metric: "Signal",
    value: "none",
    word: true,
    scale: { kind: "discrete", stops: ["none", "weak", "full"], active: 0 },
    note: "No cellular service of any kind. A satellite handset lives in the drawer,",
    emphasis: "for the one call you would actually make.",
  },
  {
    metric: "Dark sky",
    value: "2",
    unit: "Bortle",
    scale: {
      kind: "discrete",
      stops: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      active: 1,
    },
    note: "Second darkest class on the scale.",
    emphasis: "On a clear night the Milky Way throws a shadow onto snow.",
  },
  {
    metric: "Biome",
    value: "forest",
    word: true,
    scale: {
      kind: "discrete",
      stops: ["forest", "snow", "desert", "bamboo", "coast", "highland"],
      active: 0,
    },
    note: "Old spruce, standing water, forty metres of canopy.",
    emphasis: "The palette of this page was taken from it.",
  },
];

const houses: {
  num: string;
  name: string;
  place: string;
  solitude: string;
  silence: string;
  bortle: string;
  price: string;
  plate: () => ReactElement;
  offset?: string;
}[] = [
  {
    num: "01 / 41",
    name: "Drift",
    place: "Tanana Shelf, 64°N — snow",
    solitude: "41",
    silence: "24",
    bortle: "1",
    price: "540",
    plate: SnowPlate,
  },
  {
    num: "02 / 41",
    name: "Kiln",
    place: "Estrella Flats, 32°N — desert",
    solitude: "58",
    silence: "19",
    bortle: "1",
    price: "470",
    plate: DesertPlate,
    offset: styles.cardOffset1,
  },
  {
    num: "03 / 41",
    name: "Salt",
    place: "Kerrow Point, 55°N — coast",
    solitude: "22",
    silence: "36",
    bortle: "3",
    price: "610",
    plate: CoastPlate,
    offset: styles.cardOffset2,
  },
];

/* -------------------------------------------------------------------- page */

export default function EditorialWilderness() {
  return (
    <div className={`${display.variable} ${sans.variable} ${mono.variable} ${styles.root}`}>
      <svg className={styles.grain} aria-hidden="true" focusable="false">
        <defs>
          <Grain id="pageGrain" frequency={0.78} />
        </defs>
        <rect width="100%" height="100%" filter="url(#pageGrain)" />
      </svg>

      <div className={styles.shell}>
        <header className={styles.masthead}>
          <p className={styles.wordmark}>STILLNEST</p>
          <nav className={styles.mastNav} aria-label="Sections">
            <a className={styles.mastLink} href="#index">
              The Index
            </a>
            <a className={`${styles.mastLink} ${styles.mastLinkSm}`} href="#houses">
              Houses
            </a>
            <a className={`${styles.mastLink} ${styles.mastLinkMd}`} href="#index">
              Method
            </a>
            <a className={styles.mastLink} href="#houses">
              Enquire
            </a>
          </nav>
        </header>

        {/* ---------------------------------------------------------- hero */}
        <section className={styles.hero}>
          <div className={styles.grid}>
            <h1 className={styles.headline}>
              <span>Nowhere.</span>
              <span className={styles.headlineTwo}>On purpose.</span>
            </h1>

            <div className={styles.lede}>
              <span className={styles.ledeLabel}>Vol. 01 — Six biomes</span>
              <p className={styles.ledeBody}>
                We do not sell houses. We sell the distance between you and everyone
                else, measured in kilometres, decibels and the absence of bars on a
                screen. Forty-one addresses. Not one of them appears on a road sign.
              </p>
            </div>
          </div>

          <figure className={styles.heroFigure}>
            <figcaption className={styles.heroCaption}>
              <div className={styles.captionRule} />
              <p className={styles.captionText}>
                Nokken, at the ninth hour of a February morning. The nearest neighbour
                is thirty-four kilometres away, and still asleep.
              </p>
              <dl className={styles.coords}>
                <div className={styles.coordRow}>
                  <dt>Location</dt>
                  <dd>Ålvik Basin, 62°N</dd>
                </div>
                <div className={styles.coordRow}>
                  <dt>Access</dt>
                  <dd>Boat, or walk</dd>
                </div>
                <div className={styles.coordRow}>
                  <dt>Built</dt>
                  <dd>2024, in eleven days</dd>
                </div>
              </dl>
            </figcaption>

            <div className={styles.plateWrap}>
              <div className={styles.plate}>
                <LakePlate />
                <span className={styles.plateEdge} />
              </div>
              <span className={styles.plateTag}>Fig. 01 — Nokken, first light</span>
            </div>
          </figure>
        </section>

        {/* ------------------------------------------------ solitude index */}
        <section id="index">
          <div className={styles.marker}>
            <span className={styles.markerLabel}>
              No. 01 <em>—</em> The Solitude Index
            </span>
            <span className={styles.markerMeta}>
              Specimen: Nokken / measured 04 Feb, 04:12
            </span>
          </div>

          <div className={`${styles.grid} ${styles.indexIntro}`}>
            <h2 className={styles.indexHeading}>
              Every house is measured before it is listed. Not by bedrooms —{" "}
              <em>by how far the world agreed to stand back.</em>
            </h2>
            <p className={styles.indexNote}>
              <i>Five readings, taken on site.</i> Nothing is estimated and nothing is
              rounded in our favour. Where a house scores badly, it says so — a weak
              signal is printed as a weak signal. The index is the listing. There is no
              bedroom count on this page, and there will not be one.
            </p>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption>
                Table 1 — Solitude Index for Nokken, Ålvik Basin. Readings taken over
                seven consecutive nights in February; the silence figure is the
                quietest hour, not the mean.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={styles.colMetric}>
                    Metric
                  </th>
                  <th scope="col" className={styles.colReading}>
                    Reading
                  </th>
                  <th scope="col" className={styles.colScale}>
                    Scale
                  </th>
                  <th scope="col" className={styles.colNote}>
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r, i) => (
                  <tr key={r.metric}>
                    <th scope="row" className={styles.metric}>
                      <span className={styles.metricIndex}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {r.metric}
                    </th>
                    <td>
                      <p className={styles.reading}>
                        <span className={r.word ? styles.readingWord : undefined}>
                          {r.value}
                        </span>
                        {r.unit ? (
                          <span className={styles.readingUnit}>{r.unit}</span>
                        ) : null}
                      </p>
                    </td>
                    <td>
                      <Ruler scale={r.scale} />
                    </td>
                    <td className={styles.note}>
                      {r.note} <em>{r.emphasis}</em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------------- houses */}
        <section id="houses">
          <div className={styles.marker}>
            <span className={styles.markerLabel}>
              No. 02 <em>—</em> Currently unoccupied
            </span>
            <span className={styles.markerMeta}>Three of forty-one houses</span>
          </div>

          <div className={styles.grid}>
            <p className={styles.housesLede}>
              Three houses, all empty, all inconvenient. That is the point: the drive
              is the price of admission, and the last twelve kilometres are not paved.
            </p>
          </div>

          <div className={styles.cards}>
            {houses.map((h) => {
              const Plate = h.plate;
              return (
                <a
                  key={h.name}
                  href="#houses"
                  className={`${styles.card} ${h.offset ?? ""}`}
                >
                  <div className={styles.cardPlate}>
                    <Plate />
                  </div>

                  <div className={styles.cardHead}>
                    <h3 className={styles.cardName}>{h.name}</h3>
                    <span className={styles.cardNum}>{h.num}</span>
                  </div>

                  <p className={styles.cardPlace}>{h.place}</p>

                  <dl className={styles.cardStats}>
                    <div className={styles.stat}>
                      <dt>Solitude</dt>
                      <dd>
                        {h.solitude}
                        <small>km</small>
                      </dd>
                    </div>
                    <div className={styles.stat}>
                      <dt>Silence</dt>
                      <dd>
                        {h.silence}
                        <small>dB</small>
                      </dd>
                    </div>
                    <div className={styles.stat}>
                      <dt>Dark sky</dt>
                      <dd>
                        {h.bortle}
                        <small>Bortle</small>
                      </dd>
                    </div>
                  </dl>

                  <div className={styles.cardFoot}>
                    <span className={styles.cardPrice}>
                      From <em>${h.price}</em> a night
                    </span>
                    <span className={styles.cardGo}>Enquire →</span>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <footer className={styles.colophon}>
          <span>Stillnest — Nowhere. On purpose.</span>
          <span>Concept project. The houses are fictional.</span>
          <span>Direction — Editorial Wilderness</span>
        </footer>
      </div>
    </div>
  );
}
