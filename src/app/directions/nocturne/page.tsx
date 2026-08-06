import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Mono } from "next/font/google";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ *
 *  NOCTURNE — deep night, one warm window, a long way from anyone.
 *  Every visual on this page is CSS + inline SVG. No image assets.
 * ------------------------------------------------------------------ */

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
  style: ["normal", "italic"],
  variable: "--n-display",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--n-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stillnest — Nocturne",
  description: "Nowhere. On purpose.",
};

/* ---------- deterministic noise (no hydration drift, no Math.random) ---------- */

function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function Stars({
  seed,
  count,
  className,
}: {
  seed: number;
  count: number;
  className: string;
}) {
  const rand = seeded(seed);
  const stars = Array.from({ length: count }, () => {
    const bias = rand();
    return {
      x: rand() * 1600,
      y: Math.pow(rand(), 1.5) * 900,
      r: 0.5 + bias * 1.35,
      o: 0.12 + Math.pow(bias, 2.2) * 0.78,
    };
  });

  return (
    <svg
      className={className}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x.toFixed(1)}
          cy={s.y.toFixed(1)}
          r={s.r.toFixed(2)}
          fill="#dce8ff"
          opacity={s.o.toFixed(3)}
        />
      ))}
    </svg>
  );
}

function ridgeline(seed: number, teeth: number, jag: number): string {
  const rand = seeded(seed);
  const W = 1600;
  const H = 200;
  let d = `M0 ${H}`;
  let x = 0;
  while (x < W) {
    // uneven spacing and heights — a treeline, not a sawtooth
    const w = (W / teeth) * (0.45 + rand() * 1.5);
    const base = H - 4 - rand() * 26;
    const peak = H - (18 + Math.pow(rand(), 1.7) * jag);
    const apex = x + w * (0.24 + rand() * 0.52);
    d += ` L${x.toFixed(1)} ${base.toFixed(1)} L${apex.toFixed(1)} ${peak.toFixed(1)}`;
    x += w;
  }
  return `${d} L${W} ${(H - 8).toFixed(1)} L${W} ${H} Z`;
}

function Treeline({
  seed,
  teeth,
  jag,
  className,
  fill,
}: {
  seed: number;
  teeth: number;
  jag: number;
  className: string;
  fill: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 1600 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={ridgeline(seed, teeth, jag)} fill={fill} />
    </svg>
  );
}

/* ---------------------------- the survey data ---------------------------- */

type Rail =
  | { kind: "scale"; pct: number; min: string; max: string }
  | { kind: "seg"; count: number; active: number; min: string; max: string };

type Metric = {
  label: string;
  value: string;
  unit?: string;
  word?: boolean;
  caption: string;
  rail: Rail;
};

const METRICS: Metric[] = [
  {
    label: "Solitude",
    value: "34",
    unit: "km",
    caption:
      "To the nearest permanent dwelling. In every direction, not the convenient one.",
    rail: { kind: "scale", pct: 56.7, min: "0", max: "60 km" },
  },
  {
    label: "Silence",
    value: "32",
    unit: "dB",
    caption:
      "Ambient, measured on site at 02:00. Low enough to hear your own breathing.",
    rail: { kind: "scale", pct: 24, min: "20", max: "70 dB" },
  },
  {
    label: "Signal",
    value: "none",
    word: true,
    caption:
      "No cellular. No broadband. A satellite handset lives in the drawer, unused.",
    rail: { kind: "seg", count: 3, active: 0, min: "none", max: "full" },
  },
  {
    label: "Dark sky",
    value: "2",
    unit: "Bortle",
    caption:
      "On a clear night the Milky Way is bright enough to throw a shadow on snow.",
    rail: { kind: "seg", count: 9, active: 1, min: "1", max: "9" },
  },
  {
    label: "Biome",
    value: "forest",
    word: true,
    caption:
      "Old spruce and black standing water. The road stops nine kilometres short.",
    rail: { kind: "seg", count: 6, active: 0, min: "forest", max: "snow" },
  },
];

type House = {
  name: string;
  biome: string;
  region: string;
  copy: string;
  price: string;
  stats: [string, string][];
  scene: "snow" | "desert" | "coast";
  seed: number;
};

const HOUSES: House[] = [
  {
    name: "Halvard 07",
    biome: "Snow",
    region: "Sarek, Sweden",
    copy: "The road gives up nine kilometres out. After that it is a snowcat, then your own two feet, then a door — and behind it twenty-two degrees and a fire already lit.",
    price: "€340",
    stats: [
      ["Solitude", "61 km"],
      ["Silence", "26 dB"],
      ["Signal", "none"],
    ],
    scene: "snow",
    seed: 7,
  },
  {
    name: "Meridian 05",
    biome: "Desert",
    region: "Atacama, Chile",
    copy: "One concrete bar laid on gravel that has not seen rain since 1997. The roof is a telescope mount. Everything above it does the rest of the work.",
    price: "€410",
    stats: [
      ["Solitude", "88 km"],
      ["Silence", "21 dB"],
      ["Signal", "weak"],
    ],
    scene: "desert",
    seed: 23,
  },
  {
    name: "Driftline 09",
    biome: "Coast",
    region: "Westfjords, Iceland",
    copy: "Anchored to black rock above a fjord nobody has a reason to enter. The wind is the only thing here that arrives without asking first.",
    price: "€295",
    stats: [
      ["Solitude", "27 km"],
      ["Silence", "38 dB"],
      ["Signal", "none"],
    ],
    scene: "coast",
    seed: 41,
  },
];

/* -------------------------------- pieces -------------------------------- */

function RailView({ rail }: { rail: Rail }) {
  return (
    <div className={styles.rail}>
      {rail.kind === "scale" ? (
        <div className={styles.railTrack}>
          <span
            className={styles.railMarker}
            style={{ "--p": `${rail.pct}%` } as CSSProperties}
          />
        </div>
      ) : (
        <div className={styles.segTrack}>
          {Array.from({ length: rail.count }, (_, i) => (
            <span
              key={i}
              className={i === rail.active ? styles.segOn : styles.seg}
            />
          ))}
        </div>
      )}
      <div className={styles.railScale}>
        <span>{rail.min}</span>
        <span>{rail.max}</span>
      </div>
    </div>
  );
}

function Lodge({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <span className={styles.bloomFar} />
      <span className={styles.bloomNear} />
      <div className={styles.mass}>
        <span className={styles.win} />
        <span className={styles.slit} />
      </div>
      <span className={styles.spill} />
    </div>
  );
}

function MiniScene({ house }: { house: House }) {
  return (
    <div className={`${styles.stageMini} ${styles[house.scene]}`} aria-hidden="true">
      <span className={styles.mSky} />
      <Stars seed={house.seed} count={70} className={styles.mStars} />
      {house.scene === "snow" && (
        <>
          <Treeline
            seed={house.seed + 1}
            teeth={26}
            jag={70}
            className={styles.mTrees}
            fill="#070d17"
          />
          <span className={styles.mDrift} />
          <span className={styles.mDriftTwo} />
        </>
      )}
      {house.scene === "desert" && (
        <>
          <span className={styles.mDuneFar} />
          <span className={styles.mDune} />
        </>
      )}
      {house.scene === "coast" && (
        <>
          <span className={styles.mSea} />
          <span className={styles.mGlint} />
          <span className={styles.mRock} />
        </>
      )}
      <span className={styles.mHaze} />
      <Lodge className={styles.mLodge} />
      <span className={styles.mVignette} />
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

export default function NocturnePage(): ReactNode {
  return (
    <main className={`${display.variable} ${mono.variable} ${styles.page}`}>
      {/* film grain — inline feTurbulence, fixed to the viewport like a lens */}
      <svg className={styles.grain} aria-hidden="true">
        <filter id="nocturne-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#nocturne-grain)" />
      </svg>

      {/* ------------------------------ HERO ------------------------------ */}
      <header className={styles.hero}>
        <div className={styles.stage} aria-hidden="true">
          <span className={styles.sky} />
          <span className={styles.milkyway} />
          <Stars seed={19} count={190} className={styles.stars} />
          <Treeline
            seed={3}
            teeth={30}
            jag={90}
            className={styles.ridgeFar}
            fill="#101c2e"
          />
          <Treeline
            seed={11}
            teeth={44}
            jag={72}
            className={styles.ridgeNear}
            fill="#03060c"
          />
          <span className={styles.fog} />
          <span className={styles.water} />
          <span className={styles.reflection} />
          <span className={styles.reflectionWide} />
          <Lodge className={styles.lodge} />
          <span className={styles.shore} />
          <span className={styles.vignette} />
        </div>

        <div className={styles.frame}>
          <div className={styles.brandRow}>
            <div className={styles.wordmark}>
              <span className={styles.markLight} />
              Stillnest
            </div>
            <div className={styles.readout}>
              <span>65°58′N 15°42′E</span>
              <span>02:47 · −11°C · clear</span>
            </div>
          </div>

          <div className={styles.pin} aria-hidden="true">
            <span className={styles.pinLabel}>Longwater 02</span>
            <span className={styles.pinSub}>34 km to the nearest door</span>
            <span className={styles.pinLine} />
          </div>

          <div className={styles.foot}>
            <div className={styles.footLeft}>
              <h1 className={styles.tagline}>
                Nowhere.
                <em>On purpose.</em>
              </h1>
              <a className={styles.enter} href="#index">
                Read the Solitude Index
              </a>
            </div>
            <p className={styles.manifesto}>
              We don&rsquo;t sell the house. We sell the distance around it.
            </p>
          </div>
        </div>
      </header>

      {/* -------------------------- SOLITUDE INDEX -------------------------- */}
      <section className={styles.index} id="index">
        <div className={styles.head}>
          <span className={styles.kicker}>
            <i className={styles.pulse} />
            The Solitude Index
          </span>
          <h2 className={styles.h2}>
            We never list the bedrooms.
            <em>We list the distance.</em>
          </h2>
          <p className={styles.lede}>
            Every house is surveyed on site, after dark, before it goes on the
            map. Five readings — and no others. A bedroom count has never once
            told anyone how alone they were about to be.
          </p>
        </div>

        <article className={styles.panel}>
          <span className={`${styles.corner} ${styles.cTL}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cTR}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cBL}`} aria-hidden="true" />
          <span className={`${styles.corner} ${styles.cBR}`} aria-hidden="true" />

          <header className={styles.panelHead}>
            <div>
              <h3 className={styles.panelName}>Longwater 02</h3>
              <p className={styles.panelWhere}>
                Vindelfjällen, Sweden · 65°58′N 15°42′E
              </p>
            </div>
            <p className={styles.panelMeta}>
              Surveyed 14 Nov, 02:47 local
              <span>Instruments at 1.5 m, lake side</span>
            </p>
          </header>

          <ul className={styles.metrics}>
            {METRICS.map((m) => (
              <li key={m.label} className={styles.metric}>
                <span className={styles.mLabel}>{m.label}</span>
                <p
                  className={`${styles.mValue} ${m.word ? styles.mWord : ""}`}
                >
                  {m.value}
                  {m.unit ? <span className={styles.mUnit}>{m.unit}</span> : null}
                </p>
                <RailView rail={m.rail} />
                <p className={styles.mCaption}>{m.caption}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      {/* ------------------------------ HOUSES ------------------------------ */}
      <section className={styles.fleet} id="houses">
        <div className={styles.fleetHead}>
          <div>
            <span className={styles.kicker}>Three of twelve</span>
            <h2 className={styles.h2}>Unoccupied tonight.</h2>
          </div>
          <p className={styles.fleetNote}>
            Availability is thin by design. We keep twelve houses and we do not
            intend to keep thirteen.
          </p>
        </div>

        <ul className={styles.cards}>
          {HOUSES.map((h) => (
            <li key={h.name} className={styles.card}>
              <MiniScene house={h} />
              <div className={styles.cardBody}>
                <div className={styles.cardTop}>
                  <h3 className={styles.cardName}>{h.name}</h3>
                  <span className={styles.cardBiome}>{h.biome}</span>
                </div>
                <p className={styles.cardCopy}>{h.copy}</p>
                <dl className={styles.cardStats}>
                  {h.stats.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className={styles.cardFoot}>
                  <span>{h.region}</span>
                  <span className={styles.price}>
                    {h.price}
                    <i>/ night</i>
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <span>Stillnest — Nowhere. On purpose.</span>
        <span className={styles.disclaimer}>
          Concept project. These houses are fictional and cannot be rented.
        </span>
      </footer>
    </main>
  );
}
