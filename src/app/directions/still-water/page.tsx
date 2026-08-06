import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Newsreader } from "next/font/google";
import styles from "./page.module.css";

/* ==================================================================== *
 *  STILL WATER — material and stillness.
 *
 *  The whole page is built on one device: a WATERLINE. Things stand on
 *  a hairline and cast a soft inverted echo below it — the lake in the
 *  hero, the headings, the readings of the Solitude Index, each card.
 *
 *  Every visual is CSS + inline SVG. No image assets, no remote URLs.
 *  All randomness is seeded, so server and client agree exactly.
 * ==================================================================== */

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--sw-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--sw-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stillnest — Still Water",
  description: "Nowhere. On purpose.",
};

/* ------------------------- deterministic noise ------------------------- */

function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number): string => n.toFixed(1);

const VB_W = 1600;
const VB_H = 200;

/* ---------------------------- silhouettes ----------------------------- */

/**
 * One spruce. Monotonic taper from base to apex — a cone, not a rhombus —
 * with a branch notch at every tier so the edge stays needled.
 */
function spruce(
  x: number,
  w: number,
  h: number,
  baseY: number,
  lean: number,
): string {
  const apexX = x + w / 2 + lean;
  const tiers = 10;
  const lift = (h / tiers) * 0.5;
  const halfAt = (t: number) => (w / 2) * Math.pow(t, 0.92);
  let d = ` L${f(apexX - halfAt(1))} ${f(baseY)}`;

  for (let i = tiers; i >= 1; i--) {
    const t = i / tiers;
    const y = baseY - h * (1 - t);
    const half = halfAt(t);
    d += ` L${f(apexX - half)} ${f(y)} L${f(apexX - half * 0.62)} ${f(y - lift)}`;
  }
  d += ` L${f(apexX)} ${f(baseY - h)}`;
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers;
    const y = baseY - h * (1 - t);
    const half = halfAt(t);
    d += ` L${f(apexX + half * 0.62)} ${f(y - lift)} L${f(apexX + half)} ${f(y)}`;
  }
  return d + ` L${f(apexX + halfAt(1))} ${f(baseY)}`;
}

function sprucePath(seed: number, count: number, tall: number): string {
  const rand = seeded(seed);
  let d = `M0 ${VB_H}`;
  const step = (VB_W + 80) / count;
  let x = -40;
  while (x < VB_W + 20) {
    const w = step * (1.5 + rand() * 0.9);
    const h = tall * (0.44 + Math.pow(rand(), 1.2) * 0.72);
    d += spruce(x, w, h, VB_H - rand() * 4, (rand() - 0.5) * w * 0.1);
    x += step * (0.5 + rand() * 0.42);
  }
  return `${d} L${VB_W} ${VB_H} Z`;
}

/** Rolling ground — moor, dune, bank. */
function hillPath(seed: number, amp: number, base: number): string {
  const rand = seeded(seed);
  const a1 = rand() * 6.283;
  const a2 = rand() * 6.283;
  const a3 = rand() * 6.283;
  let d = `M0 ${VB_H}`;
  for (let x = 0; x <= VB_W; x += 20) {
    const y =
      base -
      amp *
        (0.56 * Math.sin(x / 390 + a1) +
          0.29 * Math.sin(x / 168 + a2) +
          0.15 * Math.sin(x / 89 + a3));
    d += ` L${x} ${f(y)}`;
  }
  return `${d} L${VB_W} ${VB_H} Z`;
}

/** Bare rock — alpine ridge, sea cliff. */
function ridgePath(seed: number, teeth: number, jag: number, base: number): string {
  const rand = seeded(seed);
  const step = VB_W / teeth;
  let d = `M0 ${VB_H} L0 ${f(base)}`;
  for (let i = 1; i <= teeth; i++) {
    const x = i * step;
    const peak = base - jag * (0.22 + Math.pow(rand(), 1.7));
    const mid = x - step * (0.28 + rand() * 0.44);
    d += ` L${f(mid)} ${f(peak)} L${f(x)} ${f(base - jag * 0.14 * rand())}`;
  }
  return `${d} L${VB_W} ${VB_H} Z`;
}

function Silhouette({
  d,
  className,
  fill,
}: {
  d: string;
  className: string;
  fill: string;
}) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={d} fill={fill} />
    </svg>
  );
}

/* --------------------------------- data -------------------------------- */

type Rail =
  | { kind: "scale"; pct: number; min: string; max: string }
  | { kind: "seg"; count: number; active: number; min: string; max: string }
  | { kind: "words"; words: string[]; active: number };

type Reading = {
  label: string;
  value: string;
  unit?: string;
  word?: boolean;
  note: string;
  rail: Rail;
};

const READINGS: Reading[] = [
  {
    label: "Solitude",
    value: "34",
    unit: "km",
    note: "To the nearest lit window that isn't yours — in every direction, not the convenient one. The road gives out eleven kilometres short of the door.",
    rail: { kind: "scale", pct: 56.7, min: "0", max: "60 km" },
  },
  {
    label: "Silence",
    value: "32",
    unit: "dB",
    note: "Measured at 03:10 from the jetty. Quiet enough that the loudest thing in the house is the stove settling.",
    rail: { kind: "scale", pct: 24, min: "20", max: "70 dB" },
  },
  {
    label: "Signal",
    value: "none",
    word: true,
    note: "No cellular, no line, no compromise. A satellite handset lives in the drawer by the door and has never been switched on.",
    rail: { kind: "seg", count: 3, active: 0, min: "none", max: "full" },
  },
  {
    label: "Dark sky",
    value: "2",
    unit: "Bortle",
    note: "Walk down to the water near midnight and there is enough starlight on the surface to find the path back without a lamp.",
    rail: { kind: "seg", count: 9, active: 1, min: "1", max: "9" },
  },
  {
    label: "Biome",
    value: "forest",
    word: true,
    note: "Old spruce, standing black water, moss over the whole of it. It rains most days. It is better that way.",
    rail: {
      kind: "words",
      words: ["forest", "moor", "alpine", "coast", "desert"],
      active: 0,
    },
  },
];

type Scene = "moor" | "alpine" | "coast";

type House = {
  name: string;
  biome: string;
  region: string;
  copy: string;
  price: string;
  stats: [string, string][];
  scene: Scene;
  seed: number;
};

const HOUSES: House[] = [
  {
    name: "Rannoch 06",
    biome: "Moor",
    region: "Rannoch, Scotland",
    copy: "Nine kilometres of peat track, then a black-timber box set on staddle stones above the wet. The wind does all of the talking here. Bring boots you would not mind losing.",
    price: "€280",
    stats: [
      ["Solitude", "21 km"],
      ["Silence", "29 dB"],
      ["Sky", "Bortle 3"],
    ],
    scene: "moor",
    seed: 12,
  },
  {
    name: "Fjellstue 02",
    biome: "Alpine",
    region: "Jotunheimen, Norway",
    copy: "Above the last tree and below the first cloud. From November you arrive on skis, and the stove has been lit for two hours before you get your gloves off.",
    price: "€340",
    stats: [
      ["Solitude", "48 km"],
      ["Silence", "24 dB"],
      ["Sky", "Bortle 2"],
    ],
    scene: "alpine",
    seed: 29,
  },
  {
    name: "Kaldbak 09",
    biome: "Coast",
    region: "Streymoy, Faroe Islands",
    copy: "Turf roof, dry stone walls, one deep window facing the sound. Sixty metres of black cliff between the doorstep and a sea that nobody has ever swum in.",
    price: "€265",
    stats: [
      ["Solitude", "17 km"],
      ["Silence", "41 dB"],
      ["Sky", "Bortle 3"],
    ],
    scene: "coast",
    seed: 47,
  },
];

/* ------------------------------- the house ------------------------------ */

/** A dark timber-and-stone mass with two lit openings. Used upright and mirrored. */
function Lodge({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <span className={styles.roof} />
      <span className={styles.upper}>
        <span className={styles.glazing} />
      </span>
      <span className={styles.lower}>
        <span className={styles.stone} />
        <span className={styles.door} />
      </span>
      <span className={styles.bloom} />
    </div>
  );
}

/* ------------------------------ hero scene ------------------------------ */

/**
 * The hero media slot's contents. When real photography arrives this whole
 * component is replaced by <img> or <video> inside .media — the slot already
 * sizes and crops its child, so nothing about the layout changes.
 */
function ForestDusk() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <span className={styles.sky} />
      <span className={styles.skyGlow} />

      <Silhouette
        d={sprucePath(3, 104, 128)}
        className={styles.treesFar}
        fill="#1d2a23"
      />
      <span className={styles.fogHigh} />
      <Silhouette
        d={sprucePath(17, 70, 164)}
        className={styles.treesMid}
        fill="#111a15"
      />
      <span className={styles.fogLow} />
      <Silhouette
        d={sprucePath(41, 44, 186)}
        className={styles.treesNear}
        fill="#070c09"
      />

      <Lodge className={styles.lodge} />
      <span className={styles.shore} />

      {/* --- the waterline: everything below is the world, doubled --- */}
      <span className={styles.water} />
      <div className={styles.mirror}>
        <Silhouette
          d={sprucePath(41, 44, 186)}
          className={styles.treesNear}
          fill="#0c140f"
        />
        <Lodge className={styles.lodge} />
      </div>
      <span className={styles.ripple} />
      <span className={styles.spill} />

      {/* foreground: trunks close enough to touch, and a moss bank */}
      <span className={styles.canopy} />
      <span className={`${styles.trunk} ${styles.trunkA}`} />
      <span className={`${styles.trunk} ${styles.trunkB}`} />
      <span className={`${styles.trunk} ${styles.trunkC}`} />
      <span className={styles.bank} />
      <span className={styles.vignette} />
    </div>
  );
}

/* ------------------------------ card scenes ----------------------------- */

const SCENES: Record<
  Scene,
  { vars: CSSProperties; far: string; near: string; farFill: string; nearFill: string }
> = {
  /* the biome drives the palette — that is the whole premise of the search */
  moor: {
    vars: {
      "--sky-hi": "#12140f",
      "--sky-lo": "#4b432c",
      "--wash": "rgba(214, 168, 92, 0.22)",
      "--water-hi": "#2a2a1d",
      "--water-lo": "#080a06",
      "--hx": "38%",
    } as CSSProperties,
    far: hillPath(12, 30, 168),
    near: hillPath(13, 17, 190),
    farFill: "#1e1e14",
    nearFill: "#0b0d09",
  },
  alpine: {
    vars: {
      "--sky-hi": "#0d151c",
      "--sky-lo": "#4a5c6b",
      "--wash": "rgba(168, 196, 214, 0.16)",
      "--water-hi": "#33404a",
      "--water-lo": "#0a0f12",
      "--hx": "68%",
    } as CSSProperties,
    far: ridgePath(29, 6, 96, 188),
    near: ridgePath(31, 4, 54, 197),
    farFill: "#141d25",
    nearFill: "#0c1116",
  },
  coast: {
    vars: {
      "--sky-hi": "#0b1413",
      "--sky-lo": "#41544c",
      "--wash": "rgba(160, 190, 176, 0.16)",
      "--water-hi": "#2a3a34",
      "--water-lo": "#060b0a",
      "--hx": "30%",
    } as CSSProperties,
    far: hillPath(47, 9, 178),
    near: ridgePath(48, 3, 58, 197),
    farFill: "#16211e",
    nearFill: "#080e0c",
  },
};

function MiniScene({ house }: { house: House }) {
  const s = SCENES[house.scene];
  return (
    <div className={styles.mini} style={s.vars} aria-hidden="true">
      <span className={styles.mSky} />
      <Silhouette d={s.far} className={styles.mFar} fill={s.farFill} />
      <span className={styles.mFog} />
      <Silhouette d={s.near} className={styles.mNear} fill={s.nearFill} />
      <Lodge className={styles.mLodge} />
      <span className={styles.mWater} />
      <div className={styles.mMirror}>
        <Lodge className={styles.mLodge} />
      </div>
      <span className={styles.mRipple} />
      <span className={styles.mVignette} />
    </div>
  );
}

/* --------------------------- the waterline device ------------------------ */

/**
 * Anything wrapped in <Standing> sits on a hairline and casts an inverted,
 * blurred, rippled echo beneath it. The echo is decoration: aria-hidden,
 * unselectable, never read aloud.
 */
function Standing({
  as: Tag = "p",
  children,
  className,
  tight,
}: {
  as?: "h1" | "h2" | "p";
  children: ReactNode;
  className: string;
  tight?: boolean;
}) {
  return (
    <div className={`${styles.standing} ${tight ? styles.standTight : ""}`}>
      <Tag className={className}>{children}</Tag>
      <span className={styles.waterline} aria-hidden="true" />
      <div className={styles.echoWrap} aria-hidden="true">
        <div className={`${className} ${styles.echo}`}>{children}</div>
      </div>
    </div>
  );
}

/* --------------------------------- rails -------------------------------- */

function RailView({ rail }: { rail: Rail }) {
  if (rail.kind === "words") {
    return (
      <div className={styles.rail}>
        <ul className={styles.words}>
          {rail.words.map((w, i) => (
            <li key={w} className={i === rail.active ? styles.wordOn : undefined}>
              {w}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={styles.rail}>
      {rail.kind === "scale" ? (
        <div className={styles.surface}>
          <span
            className={styles.meniscus}
            style={{ "--p": `${rail.pct}%` } as CSSProperties}
          />
        </div>
      ) : (
        <div className={styles.segs}>
          {Array.from({ length: rail.count }, (_, i) => (
            <span
              key={i}
              className={i === rail.active ? styles.segOn : styles.seg}
            />
          ))}
        </div>
      )}
      <div className={styles.scale}>
        <span>{rail.min}</span>
        <span>{rail.max}</span>
      </div>
    </div>
  );
}

/* --------------------------------- page --------------------------------- */

export default function StillWaterPage(): ReactNode {
  return (
    <main className={`${serif.variable} ${mono.variable} ${styles.page}`}>
      {/* grain — a fixed lens over the whole page, green-biased and faint */}
      <svg className={styles.grain} aria-hidden="true">
        <filter id="sw-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#sw-grain)" />
      </svg>

      {/* ================================ HERO ============================== */}
      <header className={styles.hero}>
        {/*
          MEDIA SLOT. The child is sized and cropped by .media, so a
          <video autoPlay muted loop playsInline> or <img> can be dropped in
          here later with no change to the layout above or below it.
        */}
        <div className={styles.media}>
          <ForestDusk />
        </div>

        <div className={styles.heroFrame}>
          <nav className={styles.nav} aria-label="Primary">
            <a className={styles.wordmark} href="#top">
              Stillnest
            </a>
            <ul className={styles.navLinks}>
              <li>
                <a href="#houses">Houses</a>
              </li>
              <li>
                <a href="#index">The Index</a>
              </li>
              <li>
                <a href="#creed">Philosophy</a>
              </li>
              <li>
                <a href="#foot">Contact</a>
              </li>
            </ul>
            <a className={styles.navCta} href="#houses">
              Hold a date
            </a>
          </nav>

          <div className={styles.heroBody}>
            <h1 className={styles.h1}>
              Nowhere.
              <em>On purpose.</em>
            </h1>
            <p className={styles.lede}>
              Twelve houses, each one surveyed for how far it stands from
              anybody else. We publish the distance, the decibels and the
              darkness. We have never once published a bedroom count.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#houses">
                See the twelve
              </a>
              <a className={styles.secondary} href="#index">
                How we measure
              </a>
            </div>
          </div>

          <div className={styles.heroFoot}>
            <p className={styles.footNote}>
              Forest / Moor / Alpine / Coast
              <span className={styles.sep} aria-hidden="true" />
              Surveyed on foot, after dark
            </p>
            <p className={styles.readout}>
              <span>Kolvatn 03</span>
              <span>63°51′N 11°17′E · 32 dB · 4°C · still</span>
            </p>
          </div>
        </div>
      </header>

      {/* ================================ CREED ============================= */}
      <section className={styles.creed} id="creed">
        <Standing className={styles.creedLine}>
          The house is the least of it.
          <em>What you are renting is the distance around it.</em>
        </Standing>
        <p className={styles.creedNote}>
          Nobody has ever come back from a week alone and talked about the
          joinery. They talk about the third morning, when the quiet stopped
          feeling like something missing.
        </p>
      </section>

      {/* ============================ SOLITUDE INDEX ======================== */}
      <section className={styles.index} id="index">
        <div className={styles.indexHead}>
          <p className={styles.kicker}>
            <span className={styles.drop} aria-hidden="true" />
            The Solitude Index
          </p>
          <Standing as="h2" className={styles.h2} tight>
            Five readings.
            <em>Not one is a bedroom count.</em>
          </Standing>
          <p className={styles.indexLede}>
            Every house is surveyed on site before it goes on the map — on foot,
            after dark, in the weather it actually has. Five numbers come back.
            You search on those, and on nothing else.
          </p>
        </div>

        <article className={styles.slab}>
          <header className={styles.slabHead}>
            <div>
              <h3 className={styles.slabName}>Kolvatn 03</h3>
              <p className={styles.slabWhere}>
                Trøndelag, Norway · 63°51′N 11°17′E
              </p>
            </div>
            <p className={styles.slabMeta}>
              Surveyed 09 Oct, 03:10 local
              <span>Instruments 1.5 m above the water, lake side</span>
            </p>
          </header>

          <ul className={styles.readings}>
            {READINGS.map((r) => (
              <li key={r.label} className={styles.reading}>
                <p className={styles.rLabel}>{r.label}</p>
                <p className={`${styles.rValue} ${r.word ? styles.rWord : ""}`}>
                  {r.value}
                  {r.unit ? <span className={styles.rUnit}>{r.unit}</span> : null}
                </p>
                <RailView rail={r.rail} />
                <p className={styles.rNote}>{r.note}</p>
              </li>
            ))}
          </ul>

          <footer className={styles.slabFoot}>
            <span>Readings are re-taken every season and republished.</span>
            <a className={styles.slabLink} href="#houses">
              Eleven more like this
            </a>
          </footer>
        </article>
      </section>

      {/* ================================ HOUSES ============================ */}
      <section className={styles.houses} id="houses">
        <div className={styles.housesHead}>
          <div>
            <p className={styles.kicker}>Three of twelve</p>
            <Standing as="h2" className={styles.h2} tight>
              Empty tonight.
              <em>Empty most nights.</em>
            </Standing>
          </div>
          <p className={styles.housesNote}>
            We keep twelve and we do not intend to keep thirteen. Availability
            is thin on purpose — the whole product is the absence of other
            people, and that does not scale.
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

      {/* ================================ FOOTER ============================ */}
      <footer className={styles.footer} id="foot">
        <Standing className={styles.footMark} tight>
          Nowhere. On purpose.
        </Standing>
        <div className={styles.footRow}>
          <span>Stillnest</span>
          <span className={styles.footFine}>
            Concept work. The houses are invented, the readings are not real,
            and nobody is home.
          </span>
        </div>
      </footer>
    </main>
  );
}
