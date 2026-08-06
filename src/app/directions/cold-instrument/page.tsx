import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import s from "./page.module.css";

/* ------------------------------------------------------------------
   STILLNEST — VISUAL DIRECTION 02: "COLD INSTRUMENT"
   Near-black field, cool greys, one cold accent: #8FD4E4.
   No external assets. Every visual below is generated: layered
   gradients, deterministic SVG geometry, feTurbulence grain.
------------------------------------------------------------------ */

const sans = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--stn-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  display: "swap",
  variable: "--stn-mono",
});

export const metadata: Metadata = {
  title: "Stillnest — Cold Instrument",
  description:
    "Nowhere. On purpose. Off-grid stays, measured before they are listed.",
};

/* ------------------------------------------------------------------
   GEOMETRY — deterministic, so server and client agree exactly
------------------------------------------------------------------ */

/** Closed, irregular contour ring — a measured isolation line. */
function contour(r: number, phase: number, amp: number, steps = 132): string {
  let d = "";
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const k =
      1 +
      amp * Math.sin(3 * t + phase) +
      amp * 0.55 * Math.sin(5 * t + phase * 1.9) +
      amp * 0.3 * Math.sin(9 * t - phase * 0.7);
    const x = Math.cos(t) * r * k;
    const y = Math.sin(t) * r * k * 0.84;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

/** Terrain profile across a card: crest polyline + closed fill. */
function profile(
  base: number,
  amp: number,
  seed: number,
  harmonics: readonly [number, number, number] = [6.2, 13.7, 27.3],
  step = 5,
): { line: string; fill: string } {
  const W = 400;
  const H = 300;
  let line = "";
  for (let x = 0; x <= W; x += step) {
    const t = x / W;
    const y =
      base -
      amp *
        (0.58 * Math.sin(t * harmonics[0] + seed) +
          0.28 * Math.sin(t * harmonics[1] + seed * 2.1) +
          0.14 * Math.sin(t * harmonics[2] + seed * 3.4));
    line += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`;
  }
  return { line, fill: `M0 ${H}L${line.slice(1)}L${W} ${H}Z` };
}

const HERO_RINGS = [
  { r: 96, phase: 0.4, amp: 0.1, tone: "ice" },
  { r: 158, phase: 1.9, amp: 0.09, tone: "line" },
  { r: 228, phase: 3.3, amp: 0.085, tone: "soft" },
  { r: 302, phase: 0.9, amp: 0.08, tone: "line" },
  { r: 380, phase: 2.6, amp: 0.075, tone: "soft" },
  { r: 462, phase: 4.4, amp: 0.07, tone: "soft" },
  { r: 548, phase: 1.3, amp: 0.065, tone: "line" },
  { r: 638, phase: 5.2, amp: 0.06, tone: "soft" },
  { r: 732, phase: 2.1, amp: 0.055, tone: "soft" },
] as const;

const HERO_TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const major = i % 6 === 0;
  const r0 = 790;
  const r1 = major ? 754 : 774;
  return {
    x1: (Math.cos(a) * r0).toFixed(1),
    y1: (Math.sin(a) * r0 * 0.84).toFixed(1),
    x2: (Math.cos(a) * r1).toFixed(1),
    y2: (Math.sin(a) * r1 * 0.84).toFixed(1),
    major,
  };
});

const TREE_LINE = Array.from({ length: 74 }, (_, i) => ({
  x: i * 5.5 + 3,
  h:
    58 +
    38 * Math.abs(Math.sin(i * 1.73)) +
    26 * Math.abs(Math.sin(i * 0.51 + 1.2)) +
    12 * Math.abs(Math.sin(i * 3.1)),
  o: 0.16 + 0.3 * Math.abs(Math.sin(i * 0.87 + 0.4)),
}));

const pct = (v: number, min: number, max: number) =>
  `${(((v - min) / (max - min)) * 100).toFixed(1)}%`;

/* ------------------------------------------------------------------
   CONTENT
------------------------------------------------------------------ */

const BIOMES = ["forest", "snow", "desert", "bamboo", "coast", "highland"];

const PROPERTIES = [
  {
    id: "KELVIN 02",
    biome: "Snow",
    place: "Sarek Basin, SE",
    coord: "67°18′N 17°42′E",
    index: "97",
    copy: "A concrete shelf pressed under six months of winter. Reached on skis, or not reached at all.",
    specs: [
      ["Solitude", "41 km"],
      ["Silence", "29 dB"],
      ["Signal", "None"],
      ["Dark sky", "Bortle 1"],
    ],
  },
  {
    id: "UMBRA 07",
    biome: "Forest",
    place: "Kuusamo Shield, FI",
    coord: "66°04′N 29°11′E",
    index: "88",
    copy: "Black timber inside a spruce stand that has never been cut. The road gives up nine kilometres early.",
    specs: [
      ["Solitude", "22 km"],
      ["Silence", "34 dB"],
      ["Signal", "Weak"],
      ["Dark sky", "Bortle 3"],
    ],
  },
  {
    id: "BASALT 11",
    biome: "Desert",
    place: "Namib Escarpment, NA",
    coord: "24°41′S 15°58′E",
    index: "99",
    copy: "A glass instrument set on gravel. Between it and the horizon: two days of walking, and nothing else.",
    specs: [
      ["Solitude", "58 km"],
      ["Silence", "26 dB"],
      ["Signal", "None"],
      ["Dark sky", "Bortle 1"],
    ],
  },
];

/* ------------------------------------------------------------------
   CARD ART — generated terrain, monochrome, no photography
------------------------------------------------------------------ */

const SNOW = [
  profile(188, 44, 1.1, [5.1, 11.3, 23.7]),
  profile(214, 26, 3.7, [7.4, 15.1, 29.9]),
  profile(244, 13, 0.3, [9.2, 19.4, 33.1]),
];

const DUNES = [
  profile(196, 30, 0.6, [3.1, 7.4, 14.2]),
  profile(230, 22, 2.4, [2.6, 6.1, 12.8]),
  profile(266, 15, 4.2, [3.9, 8.2, 16.4]),
];

const FOREST_FLOOR = profile(268, 8, 2.2, [4.1, 9.3, 18.6]);

/** Shared sky wash + soft cold bloom. Ids are unique per art. */
function Sky({ id, from, mid }: { id: string; from: string; mid: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="58%" stopColor={mid} />
          <stop offset="100%" stopColor="#060708" />
        </linearGradient>
        <radialGradient id={`${id}-bloom`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(143,212,228,0.16)" />
          <stop offset="55%" stopColor="rgba(143,212,228,0.05)" />
          <stop offset="100%" stopColor="rgba(143,212,228,0)" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-sky)`} />
    </>
  );
}

/** House marker — the same crosshair on every property. */
function Marker({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="var(--ice)" strokeWidth="1">
      <line x1={x - 11} y1={y} x2={x - 3} y2={y} />
      <line x1={x + 3} y1={y} x2={x + 11} y2={y} />
      <line x1={x} y1={y - 11} x2={x} y2={y - 3} />
      <line x1={x} y1={y + 3} x2={x} y2={y + 11} />
      <rect x={x - 4} y={y - 4} width="8" height="8" fill="none" opacity="0.45" />
    </g>
  );
}

function SnowArt() {
  const tones = ["#171f22", "#101619", "#090c0d"];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Sky id="ci-snow" from="#101619" mid="#0a0e10" />
      <ellipse cx="288" cy="66" rx="190" ry="150" fill="url(#ci-snow-bloom)" />
      {SNOW.map((p, i) => (
        <g key={i}>
          <path d={p.fill} fill={tones[i]} />
          <path
            d={p.line}
            fill="none"
            stroke={`rgba(214,232,236,${0.34 - i * 0.09})`}
            strokeWidth="1"
          />
        </g>
      ))}
      <g stroke="rgba(214,232,236,0.07)" strokeWidth="1">
        {[256, 266, 276, 286, 296].map((y) => (
          <line key={y} x1="0" y1={y} x2="400" y2={y} />
        ))}
      </g>
      <Marker x={128} y={224} />
    </svg>
  );
}

function ForestArt() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Sky id="ci-forest" from="#0f1518" mid="#090c0d" />
      <ellipse cx="200" cy="30" rx="240" ry="150" fill="url(#ci-forest-bloom)" />
      <g strokeWidth="1.5">
        {TREE_LINE.map((t) => (
          <line
            key={t.x}
            x1={t.x}
            y1={266}
            x2={t.x}
            y2={266 - t.h}
            stroke={`rgba(214,232,236,${t.o.toFixed(2)})`}
          />
        ))}
      </g>
      <path d={FOREST_FLOOR.fill} fill="#070809" />
      <path
        d={FOREST_FLOOR.line}
        fill="none"
        stroke="rgba(214,232,236,0.3)"
        strokeWidth="1"
      />
      <Marker x={262} y={242} />
    </svg>
  );
}

function DesertArt() {
  const tones = ["#161d21", "#0f1417", "#080b0c"];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Sky id="ci-desert" from="#0e1417" mid="#0a0d0f" />
      <ellipse cx="120" cy="60" rx="200" ry="140" fill="url(#ci-desert-bloom)" />
      <line x1="0" y1="158" x2="400" y2="158" stroke="rgba(214,232,236,0.2)" strokeWidth="1" />
      <g stroke="rgba(214,232,236,0.055)" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={i * 66} y1="158" x2={i * 92 - 130} y2="300" />
        ))}
      </g>
      {DUNES.map((p, i) => (
        <g key={i}>
          <path d={p.fill} fill={tones[i]} />
          <path
            d={p.line}
            fill="none"
            stroke={`rgba(214,232,236,${0.32 - i * 0.09})`}
            strokeWidth="1"
          />
        </g>
      ))}
      <Marker x={300} y={186} />
    </svg>
  );
}

const ART = [<SnowArt key="a" />, <ForestArt key="b" />, <DesertArt key="c" />];

/* ------------------------------------------------------------------
   PAGE
------------------------------------------------------------------ */

export default function ColdInstrumentDirection() {
  return (
    <div className={`${sans.variable} ${mono.variable} ${s.page}`}>
      {/* shared filter defs — grain generated with feTurbulence */}
      <svg className={s.defs} aria-hidden="true">
        <defs>
          <filter id="ciGrain" x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="4"
              seed="11"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>

      <div className={s.shell}>
        {/* ============ MASTHEAD ============ */}
        <header className={s.masthead}>
          <span className={s.wordmark}>Stillnest</span>
          <div className={s.mastMeta}>
            <span className={s.label}>Archive 001—046</span>
            <span className={s.label}>Measured, not described</span>
            <span className={s.mastCoord}>
              <span className={s.blip} />
              <span className={`${s.label} ${s.labelHi}`}>Field station online</span>
            </span>
          </div>
        </header>

        {/* ============ 01 · HERO ============ */}
        <section className={s.hero}>
          <div className={s.heroBack}>
            <div className={s.bloom} />
            <div className={s.mesh} />

            <svg
              className={s.contours}
              viewBox="-900 -780 1800 1560"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <g>
                {HERO_RINGS.map((ring) => (
                  <path
                    key={ring.r}
                    d={contour(ring.r, ring.phase, ring.amp)}
                    className={
                      ring.tone === "ice"
                        ? `${s.ring} ${s.ringIce}`
                        : ring.tone === "soft"
                          ? `${s.ring} ${s.ringSoft}`
                          : s.ring
                    }
                  />
                ))}
              </g>

              <g>
                {HERO_TICKS.map((t, i) => (
                  <line
                    key={i}
                    x1={t.x1}
                    y1={t.y1}
                    x2={t.x2}
                    y2={t.y2}
                    className={t.major ? `${s.tick} ${s.tickMaj}` : s.tick}
                  />
                ))}
              </g>

              {/* centre crosshair — the house, at zero */}
              <g className={s.cross}>
                <line x1="-34" y1="0" x2="-10" y2="0" />
                <line x1="10" y1="0" x2="34" y2="0" />
                <line x1="0" y1="-28" x2="0" y2="-8" />
                <line x1="0" y1="8" x2="0" y2="28" />
              </g>

              <text x="26" y="-38" className={`${s.svgText} ${s.svgTextIce}`}>
                VANTA 04 · 0.00
              </text>
              <g className={s.tick}>
                <line x1="140" y1="-150" x2="164" y2="-150" />
                <line x1="238" y1="-248" x2="262" y2="-248" />
                <line x1="346" y1="-356" x2="370" y2="-356" />
              </g>
              <text x="172" y="-145" className={s.svgText}>
                10
              </text>
              <text x="270" y="-243" className={s.svgText}>
                20
              </text>
              <text x="378" y="-351" className={s.svgText}>
                30
              </text>
              <text x="-870" y="-724" className={s.svgText}>
                ISOLATION FIELD · KM FROM DOOR
              </text>
            </svg>

            <svg className={s.grain} aria-hidden="true">
              <rect width="100%" height="100%" filter="url(#ciGrain)" />
            </svg>
          </div>

          <div className={s.heroInner}>
            <div className={s.eyebrow}>
              <span className={s.eyebrowRule} />
              <span className={`${s.label} ${s.labelHi}`}>
                01 — Off-grid stays, instrumented
              </span>
            </div>

            <h1 className={s.headline}>
              Nowhere.
              <em>
                On purpose<i>.</i>
              </em>
            </h1>

            <div className={s.heroBody}>
              <p className={s.lede}>
                Forty-six houses, each set down where the map stops arguing with
                itself. Stillnest does not rent rooms. It rents{" "}
                <strong>the distance between you and everyone else</strong> — and
                publishes the measurements before you book.
              </p>
            </div>
          </div>

          <div className={s.strip}>
            <div className={s.ruler} />
            <div className={s.readouts}>
              <div className={s.readout}>
                <span className={s.label}>Nearest dwelling</span>
                <span className={s.readoutValue}>
                  34<span>km</span>
                </span>
              </div>
              <div className={s.readout}>
                <span className={s.label}>Ambient floor</span>
                <span className={s.readoutValue}>
                  32<span>dB</span>
                </span>
              </div>
              <div className={s.readout}>
                <span className={s.label}>Cellular</span>
                <span className={`${s.readoutValue} ${s.ice}`}>None</span>
              </div>
              <div className={`${s.readout} ${s.readoutEnd}`}>
                <span className={s.label}>Archive</span>
                <span className={s.readoutValue}>46 houses · 6 biomes · 0 neighbours</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 02 · SOLITUDE INDEX ============ */}
        <section className={s.section}>
          <div className={s.sectionHead}>
            <span className={`${s.label} ${s.sectionNo}`}>02</span>
            <h2 className={s.sectionTitle}>The Solitude Index</h2>
            <p className={s.sectionNote}>
              Bedrooms and nightly rates tell you nothing about a place like this.
              Five instruments, one field visit, no adjectives. A house is listed
              only after it has been measured.
            </p>
          </div>

          <div className={s.panel}>
            <span className={`${s.reg} ${s.regTL}`} />
            <span className={`${s.reg} ${s.regTR}`} />
            <span className={`${s.reg} ${s.regBL}`} />
            <span className={`${s.reg} ${s.regBR}`} />

            <div className={s.panelHead}>
              <div className={s.panelIdent}>
                <h3 className={s.panelName}>
                  Vanta 04 <span>Ullsfjord Shelf · 69°42′N 20°11′E</span>
                </h3>
                <div className={s.panelMetaRow}>
                  <span className={s.label}>Measured 04.02.26</span>
                  <span className={s.label}>04:12 local</span>
                  <span className={s.label}>Instrument SL-9</span>
                  <span className={s.label}>Surveyor K. Røed</span>
                </div>
              </div>

              <div className={s.panelScore}>
                <div className={s.scoreSide}>
                  <span className={s.label}>Composite</span>
                  <div className={s.scoreBar}>
                    {Array.from({ length: 10 }, (_, i) => (
                      <span
                        key={i}
                        className={`${s.scoreSeg} ${i < 9 ? s.scoreSegOn : ""}`}
                      />
                    ))}
                  </div>
                  <span className={s.label}>Top 1.2% of archive</span>
                </div>
                <span className={s.scoreNum}>94</span>
              </div>
            </div>

            <div className={s.metrics}>
              {/* 1 — SOLITUDE */}
              <div className={s.metric}>
                <div className={s.metricTop}>
                  <span className={s.label}>Solitude</span>
                  <span className={`${s.label} ${s.mono}`}>01/05</span>
                </div>
                <span className={s.metricValue}>
                  34<span className={s.metricUnit}>km</span>
                </span>
                <div>
                  <div className={s.meter}>
                    <div className={s.meterTicks} />
                    <div className={s.meterTrack} />
                    <div className={s.meterFill} style={{ width: pct(34, 0, 60) }} />
                    <div className={s.meterMark} style={{ left: pct(34, 0, 60) }} />
                  </div>
                  <div className={s.meterScale}>
                    <span className={s.label}>0</span>
                    <span className={s.label}>60 km</span>
                  </div>
                </div>
                <p className={s.metricCaption}>
                  Straight-line distance to the nearest permanent human dwelling.
                  The next one along the fjord is a lighthouse, and it is empty.
                </p>
              </div>

              {/* 2 — SILENCE */}
              <div className={s.metric}>
                <div className={s.metricTop}>
                  <span className={s.label}>Silence</span>
                  <span className={`${s.label} ${s.mono}`}>02/05</span>
                </div>
                <span className={s.metricValue}>
                  32<span className={s.metricUnit}>dB</span>
                </span>
                <div>
                  <div className={s.meter}>
                    <div className={s.meterTicks} />
                    <div className={s.meterTrack} />
                    <div className={s.meterFill} style={{ width: pct(32, 20, 70) }} />
                    <div className={s.meterMark} style={{ left: pct(32, 20, 70) }} />
                  </div>
                  <div className={s.meterScale}>
                    <span className={s.label}>20 quiet</span>
                    <span className={s.label}>70 loud</span>
                  </div>
                </div>
                <p className={s.metricCaption}>
                  Ambient floor at 03:00, weighted, averaged over four nights. Low
                  enough that you will hear yourself breathe.
                </p>
              </div>

              {/* 3 — SIGNAL */}
              <div className={s.metric}>
                <div className={s.metricTop}>
                  <span className={s.label}>Signal</span>
                  <span className={`${s.label} ${s.mono}`}>03/05</span>
                </div>
                <span className={s.metricValue}>None</span>
                <div className={s.states}>
                  {["None", "Weak", "Full"].map((state, i) => (
                    <div
                      key={state}
                      className={`${s.state} ${i === 0 ? s.stateOn : ""}`}
                    >
                      <span className={s.stateBar} />
                      <span className={s.label}>{state}</span>
                    </div>
                  ))}
                </div>
                <p className={s.metricCaption}>
                  No cellular, no relay, no line of sight to one. A satellite
                  handset sits in the drawer. It has never been used.
                </p>
              </div>

              {/* 4 — DARK SKY */}
              <div className={s.metric}>
                <div className={s.metricTop}>
                  <span className={s.label}>Dark sky</span>
                  <span className={`${s.label} ${s.mono}`}>04/05</span>
                </div>
                <span className={s.metricValue}>
                  02<span className={s.metricUnit}>Bortle</span>
                </span>
                <div>
                  <div className={s.bortle}>
                    {Array.from({ length: 9 }, (_, i) => (
                      <span
                        key={i}
                        className={`${s.bortleSeg} ${i < 2 ? s.bortleOn : ""}`}
                        style={{ height: `${8 + i * 2}px` }}
                      />
                    ))}
                  </div>
                  <div className={`${s.meterScale} ${s.scaleFlush}`}>
                    <span className={s.label}>1 pristine</span>
                    <span className={s.label}>9 city</span>
                  </div>
                </div>
                <p className={s.metricCaption}>
                  Light pollution, measured at zenith. At Bortle 2 the Milky Way
                  is bright enough to cast a shadow on fresh snow.
                </p>
              </div>

              {/* 5 — BIOME */}
              <div className={s.metric}>
                <div className={s.metricTop}>
                  <span className={s.label}>Biome</span>
                  <span className={`${s.label} ${s.mono}`}>05/05</span>
                </div>
                <span className={s.metricValue}>Snow</span>
                <div>
                  <div className={s.biomes}>
                    {BIOMES.map((b) => (
                      <span
                        key={b}
                        className={`${s.biomeChip} ${b === "snow" ? s.biomeOn : ""}`}
                      />
                    ))}
                  </div>
                  <div className={s.meterScale} style={{ marginTop: 10 }}>
                    <span className={s.label}>Snow · 2 of 6</span>
                    <span className={s.label}>−14 °C mean</span>
                  </div>
                </div>
                <p className={s.metricCaption}>
                  Arctic shelf. Two hundred and fourteen days of cover, and one
                  road that is only a road for five of the twelve months.
                </p>
              </div>
            </div>

            <div className={s.panelFoot}>
              <span className={s.label}>
                Full survey · 41 pages · released on enquiry
              </span>
              <a className={s.panelFootLink} href="#archive">
                <span className={`${s.label} ${s.labelHi}`}>Open the survey</span>
                <span className={s.arrow} />
              </a>
            </div>
          </div>
        </section>

        {/* ============ 03 · PROPERTIES ============ */}
        <section className={s.section} id="archive">
          <div className={s.sectionHead}>
            <span className={`${s.label} ${s.sectionNo}`}>03</span>
            <h2 className={s.sectionTitle}>Three of forty-six</h2>
            <p className={s.sectionNote}>
              Ranked by distance, not by view. Every house below is further from
              its nearest neighbour than most people have ever been.
            </p>
          </div>

          <div className={s.cards}>
            {PROPERTIES.map((p, i) => (
              <a key={p.id} className={s.card} href="#archive">
                <div className={s.cardArt}>
                  {ART[i]}
                  <div className={s.cardArtTop}>
                    <span className={`${s.label} ${s.labelHi}`}>{p.biome}</span>
                    <span className={s.cardIndex}>{p.index}</span>
                  </div>
                  <svg className={s.grain} aria-hidden="true">
                    <rect width="100%" height="100%" filter="url(#ciGrain)" />
                  </svg>
                </div>

                <div className={s.cardMain}>
                  <div className={s.cardBody}>
                    <div>
                      <h3 className={s.cardName}>{p.id}</h3>
                      <span
                        className={s.label}
                        style={{ display: "block", marginTop: 10 }}
                      >
                        {p.place} · {p.coord}
                      </span>
                    </div>
                    <p className={s.cardCopy}>{p.copy}</p>
                  </div>

                  <div className={s.specs}>
                    {p.specs.map(([k, v]) => (
                      <div key={k} className={s.spec}>
                        <span className={s.label}>{k}</span>
                        <span
                          className={`${s.specValue} ${
                            v === "None" ? s.specValueIce : ""
                          }`}
                        >
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className={s.cardCta}>
                    <span className={s.label}>Solitude index</span>
                    <span className={s.specValue}>{p.index} / 100</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ============ FOOTER ============ */}
        <footer className={s.footer}>
          <div className={s.footerTop}>
            <p className={s.footerTagline}>
              Nowhere. <span>On purpose.</span>
            </p>
            <p className={s.sectionNote}>
              Enquiries are answered by a person, within a day, from a place with
              signal.
            </p>
          </div>
          <div className={s.footerBottom}>
            <span className={s.label}>Stillnest · Visual direction 02 — Cold Instrument</span>
            <p className={s.disclaimer}>
              Concept project. Properties, coordinates and survey figures are
              fictional and cannot be booked.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
