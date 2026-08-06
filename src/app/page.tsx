import type { CSSProperties, ReactNode } from "react";

import s from "./home.module.css";

/* ==================================================================== *
 *  HOME — spruce at dusk, one lit window, and the distance to the
 *  nearest other one.
 *
 *  This is the Forest Nocturne direction chosen in Phase 0. Palette and
 *  type tokens live in globals.css; the fonts are declared in layout.tsx.
 *
 *  Every visual here is CSS + inline SVG — placeholder until the real
 *  imagery lands in Phase 9. The hero is built as a *media slot*: the
 *  generated scene sits inside `.media` under the same rules an <img> or
 *  <video> would obey, so swapping in real footage changes nothing about
 *  the layout. That is the whole point of the structure — do not
 *  "simplify" it away.
 * ==================================================================== */

/* -------------------------------------------------------------------- *
 *  Deterministic geometry. Seeded everywhere — server and client must
 *  produce byte-identical path data or hydration drifts.
 * -------------------------------------------------------------------- */

function seeded(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => n.toFixed(1);

/** One spruce: narrow, many small tiers, a shallow notch. Never a triangle,
    never a diamond — at this scale the branches are texture, not shape. */
function spruce(cx: number, base: number, h: number, rand: () => number): string {
  const tiers = 11 + Math.floor(rand() * 6);
  const half = h * (0.115 + rand() * 0.055);
  const step = h / tiers;
  const left: string[] = [];
  const right: string[] = [];

  for (let k = 0; k < tiers; k += 1) {
    const t = k / tiers;
    const w = half * Math.pow(1 - t, 0.7) * (0.88 + rand() * 0.24);
    const y = base - step * k;
    const inner = w * 0.58;
    const notch = y - step * 0.66;
    left.push(`L${f1(cx - w)} ${f1(y)}`, `L${f1(cx - inner)} ${f1(notch)}`);
    right.unshift(`L${f1(cx + inner)} ${f1(notch)}`, `L${f1(cx + w)} ${f1(y)}`);
  }

  return [
    `M${f1(cx - half * 0.16)} ${f1(base + h * 0.02)}`,
    `L${f1(cx - half)} ${f1(base)}`,
    ...left,
    `L${f1(cx)} ${f1(base - h)}`,
    ...right,
    `L${f1(cx + half)} ${f1(base)}`,
    `L${f1(cx + half * 0.16)} ${f1(base + h * 0.02)}`,
    "Z",
  ].join("");
}

/** A band of spruce across a width — aerial perspective is done by the caller. */
function band(o: {
  seed: number;
  count: number;
  base: number;
  from: number;
  to: number;
  minH: number;
  maxH: number;
}): string {
  const rand = seeded(o.seed);
  const span = o.to - o.from;
  let d = "";
  for (let i = 0; i < o.count; i += 1) {
    const cx = o.from + (span * (i + 0.5 * rand())) / o.count;
    const h = o.minH + Math.pow(rand(), 1.35) * (o.maxH - o.minH);
    d += spruce(cx, o.base + rand() * 6, h, rand);
  }
  return d;
}

/** A tapering trunk — the foreground framing of ref.png. */
function trunk(x: number, wb: number, wt: number, top: number, bottom: number, lean: number): string {
  const c1 = bottom + (top - bottom) * 0.34;
  const c2 = bottom + (top - bottom) * 0.72;
  return [
    `M${f1(x - wb / 2)} ${f1(bottom)}`,
    `C${f1(x - wb / 2 + lean * 0.14)} ${f1(c1)} ${f1(x - wt / 2 + lean * 0.62)} ${f1(c2)} ${f1(x - wt / 2 + lean)} ${f1(top)}`,
    `L${f1(x + wt / 2 + lean)} ${f1(top)}`,
    `C${f1(x + wt / 2 + lean * 0.62)} ${f1(c2)} ${f1(x + wb / 2 + lean * 0.14)} ${f1(c1)} ${f1(x + wb / 2)} ${f1(bottom)}`,
    "Z",
  ].join("");
}

/* -------------------------------------------------------------------- *
 *  THE HOUSE — dark timber, stone base, one long roof, warm glass.
 *  Rendered twice: once standing, once mirrored in the water.
 * -------------------------------------------------------------------- */

function House({ uid }: { uid: string }): ReactNode {
  const stones = (() => {
    const rand = seeded(404);
    return Array.from({ length: 54 }, () => ({
      x: 604 + rand() * 300,
      y: 560 + rand() * 56,
      rx: 4 + rand() * 7,
      ry: 3 + rand() * 4,
      o: 0.1 + rand() * 0.22,
    }));
  })();

  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-glassA`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2ac6c" stopOpacity="0.62" />
          <stop offset="58%" stopColor="#a86f30" stopOpacity="0.44" />
          <stop offset="100%" stopColor="#4e3315" stopOpacity="0.34" />
        </linearGradient>
        <linearGradient id={`${uid}-glassB`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d59f60" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#6a431d" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id={`${uid}-bloom`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(233,168,94,0.34)" />
          <stop offset="46%" stopColor="rgba(214,140,66,0.1)" />
          <stop offset="100%" stopColor="rgba(214,140,66,0)" />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* warm air around the building, before anything solid */}
      <ellipse cx="800" cy="520" rx="330" ry="180" fill={`url(#${uid}-bloom)`} />

      {/* stone plinth */}
      <rect x="596" y="552" width="322" height="72" fill="#171d18" />
      <g>
        {stones.map((st, i) => (
          <ellipse
            key={i}
            cx={f1(st.x)}
            cy={f1(st.y)}
            rx={f1(st.rx)}
            ry={f1(st.ry)}
            fill="#39423a"
            opacity={st.o.toFixed(2)}
          />
        ))}
      </g>

      {/* ground floor */}
      <rect x="586" y="524" width="352" height="42" fill="#0c110d" />
      <rect x="612" y="530" width="180" height="34" fill={`url(#${uid}-glassB)`} />
      <rect x="812" y="532" width="42" height="30" fill={`url(#${uid}-glassB)`} opacity="0.7" />

      {/* deep overhang between floors */}
      <rect x="572" y="514" width="382" height="12" fill="#080c09" />
      <rect x="572" y="513" width="382" height="1" fill="#2a352c" opacity="0.5" />

      {/* upper floor — the lit one */}
      <rect x="606" y="452" width="318" height="62" fill="#0a0e0b" />
      <rect x="622" y="462" width="286" height="44" fill={`url(#${uid}-glassA)`} />
      {/* mullions */}
      <g fill="#0a0e0b" opacity="0.9">
        <rect x="676" y="462" width="3" height="44" />
        <rect x="742" y="462" width="3" height="44" />
        <rect x="808" y="462" width="3" height="44" />
        <rect x="866" y="462" width="3" height="44" />
      </g>

      {/* roof slab + chimney */}
      <rect x="560" y="436" width="406" height="17" fill="#090d0a" />
      <rect x="560" y="435" width="406" height="1.4" fill="#37432f" opacity="0.55" />
      <rect x="874" y="404" width="24" height="34" fill="#0a0e0b" />

      {/* interior light thrown onto the terrace */}
      <ellipse
        cx="742"
        cy="612"
        rx="190"
        ry="26"
        fill="rgba(226,158,84,0.2)"
        filter={`url(#${uid}-soft)`}
      />
    </g>
  );
}

/* -------------------------------------------------------------------- *
 *  THE HERO SCENE — viewBox 1400×1000, "slice" so it behaves exactly
 *  like object-fit: cover. Composition is kept inside the central band
 *  so the 375px crop still lands on the house.
 * -------------------------------------------------------------------- */

const WATERLINE = 658;

function ForestScene(): ReactNode {
  const uid = "fn-hero";

  const far = band({ seed: 11, count: 78, base: 642, from: -60, to: 1460, minH: 60, maxH: 150 });
  const mid = band({ seed: 27, count: 52, base: 650, from: -80, to: 1480, minH: 120, maxH: 250 });
  /* the near ring stops short of the clearing — that gap is where the house
     stands, exactly as it does in the owner's reference */
  const nearL = band({ seed: 43, count: 15, base: 664, from: -110, to: 560, minH: 210, maxH: 420 });
  const nearR = band({ seed: 61, count: 14, base: 664, from: 1000, to: 1510, minH: 210, maxH: 430 });

  const ripples = (() => {
    const rand = seeded(77);
    return Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      const y = WATERLINE + 8 + Math.pow(t, 1.5) * 330;
      const cx = 340 + rand() * 720;
      const w = 240 + rand() * 520 + t * 380;
      return { y, x0: cx - w / 2, x1: cx + w / 2, o: 0.045 + (1 - t) * 0.075 };
    });
  })();

  return (
    <svg
      className={s.mediaEl}
      viewBox="0 0 1400 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070b08" />
          <stop offset="30%" stopColor="#121a14" />
          <stop offset="62%" stopColor="#26332a" />
          <stop offset="88%" stopColor="#3b4c39" />
          <stop offset="100%" stopColor="#43553f" />
        </linearGradient>
        <radialGradient id={`${uid}-dusk`} cx="56%" cy="98%" r="62%">
          <stop offset="0%" stopColor="rgba(198,158,104,0.16)" />
          <stop offset="60%" stopColor="rgba(150,140,110,0.05)" />
          <stop offset="100%" stopColor="rgba(150,140,110,0)" />
        </radialGradient>
        <linearGradient id={`${uid}-fog`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(196,208,180,0)" />
          <stop offset="70%" stopColor="rgba(196,208,180,0.2)" />
          <stop offset="100%" stopColor="rgba(196,208,180,0.27)" />
        </linearGradient>
        <linearGradient id={`${uid}-fog2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(168,192,174,0)" />
          <stop offset="62%" stopColor="rgba(168,192,174,0.16)" />
          <stop offset="100%" stopColor="rgba(168,192,174,0.05)" />
        </linearGradient>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16201a" />
          <stop offset="30%" stopColor="#0b120d" />
          <stop offset="100%" stopColor="#050806" />
        </linearGradient>
        <linearGradient id={`${uid}-mirror`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.66" />
          <stop offset="38%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-vignette`} cx="52%" cy="46%" r="74%">
          <stop offset="42%" stopColor="rgba(4,7,5,0)" />
          <stop offset="100%" stopColor="rgba(4,7,5,0.86)" />
        </radialGradient>
        <filter id={`${uid}-blurFar`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={`${uid}-blurMid`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id={`${uid}-blurNear`} x="-14%" y="-14%" width="128%" height="128%">
          <feGaussianBlur stdDeviation="4.6" />
        </filter>
        <filter id={`${uid}-blurWater`} x="-14%" y="-14%" width="128%" height="128%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id={`${uid}-blurBough`} x="-14%" y="-14%" width="128%" height="128%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${uid}-blurGlow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <mask id={`${uid}-mirrorMask`}>
          <rect
            x="0"
            y={WATERLINE}
            width="1400"
            height={1000 - WATERLINE}
            fill={`url(#${uid}-mirror)`}
          />
        </mask>
      </defs>

      {/* sky, the low dusk behind the ridge, and fog standing in the trees */}
      <rect x="0" y="0" width="1400" height={WATERLINE} fill={`url(#${uid}-sky)`} />
      <rect x="0" y="200" width="1400" height={WATERLINE - 200} fill={`url(#${uid}-dusk)`} />
      <rect x="0" y="260" width="1400" height={WATERLINE - 260} fill={`url(#${uid}-fog)`} />

      {/* far plane: texture, not trees — you are not meant to count them */}
      <path d={far} fill="#33443a" opacity="0.5" filter={`url(#${uid}-blurFar)`} />
      <rect x="0" y="400" width="1400" height={WATERLINE - 400} fill={`url(#${uid}-fog2)`} />
      <path d={mid} fill="#1a241d" opacity="0.94" filter={`url(#${uid}-blurMid)`} />

      <g className={s.fogDrift}>
        <ellipse
          cx="700"
          cy="590"
          rx="820"
          ry="86"
          fill="rgba(196,208,180,0.13)"
          filter={`url(#${uid}-blurNear)`}
        />
      </g>

      {/* the house, set back into the clearing */}
      <g transform="translate(215.4,190.2) scale(0.74)">
        <House uid={`${uid}-a`} />
      </g>

      {/* near plane closes around the clearing */}
      <path d={nearL} fill="#0a0f0b" />
      <path d={nearR} fill="#0a0f0b" />

      {/* shoreline: rock, moss, the last dry metre */}
      <path
        d="M0 640 C170 630 300 648 430 641 C560 634 640 646 760 643 C880 640 1010 650 1150 641 C1260 634 1330 648 1400 642 L1400 672 L0 672 Z"
        fill="#060a07"
      />

      {/* still black water */}
      <rect x="0" y={WATERLINE} width="1400" height={1000 - WATERLINE} fill={`url(#${uid}-water)`} />

      <g mask={`url(#${uid}-mirrorMask)`}>
        <g transform={`translate(0,${WATERLINE * 2}) scale(1,-1)`} filter={`url(#${uid}-blurWater)`}>
          <path d={nearL} fill="#080d09" opacity="0.7" />
          <path d={nearR} fill="#080d09" opacity="0.7" />
          <path d={mid} fill="#111811" opacity="0.5" />
          <g transform="translate(215.4,190.2) scale(0.74)">
            <House uid={`${uid}-b`} />
          </g>
        </g>
      </g>

      {/* the amber column under the window — where the eye goes and stays */}
      <ellipse
        cx="780"
        cy={WATERLINE + 96}
        rx="60"
        ry="104"
        fill="rgba(226,160,86,0.13)"
        filter={`url(#${uid}-blurGlow)`}
      />

      <g stroke="#a9c4b0" strokeWidth="1" fill="none">
        {ripples.map((r, i) => (
          <line
            key={i}
            x1={f1(r.x0)}
            y1={f1(r.y)}
            x2={f1(r.x1)}
            y2={f1(r.y)}
            opacity={r.o.toFixed(3)}
          />
        ))}
      </g>

      {/* foreground trunks — out of focus, framing, almost black */}
      <g fill="#040604">
        <path d={trunk(72, 86, 54, -20, 1020, 22)} filter={`url(#${uid}-blurNear)`} />
        <path d={trunk(1332, 100, 62, -20, 1020, -30)} filter={`url(#${uid}-blurNear)`} />
        <path
          d={trunk(452, 30, 18, -20, 700, 8)}
          opacity="0.72"
          filter={`url(#${uid}-blurMid)`}
        />
        <path
          d={trunk(1178, 24, 14, -20, 668, -6)}
          opacity="0.62"
          filter={`url(#${uid}-blurMid)`}
        />
      </g>

      {/* boughs hanging into the frame — you are standing under a tree */}
      <g fill="#050806" filter={`url(#${uid}-blurBough)`}>
        <g transform="translate(84,-70) rotate(128)">
          <path d={spruce(0, 0, 470, seeded(5))} />
        </g>
        <g transform="translate(-40,90) rotate(104)">
          <path d={spruce(0, 0, 380, seeded(19))} opacity="0.9" />
        </g>
        <g transform="translate(1330,-60) rotate(-124)">
          <path d={spruce(0, 0, 430, seeded(31))} />
        </g>
        <g transform="translate(1440,110) rotate(-98)">
          <path d={spruce(0, 0, 330, seeded(47))} opacity="0.85" />
        </g>
      </g>

      <rect x="0" y="0" width="1400" height="1000" fill={`url(#${uid}-vignette)`} />
    </svg>
  );
}

/* -------------------------------------------------------------------- *
 *  THE REACH LINE — the signature. A measured hairline: your door at one
 *  end, the nearest other door at the other, and the fog in between.
 *  Used once over the hero, once inside the index panel.
 * -------------------------------------------------------------------- */

function ReachLine({
  km,
  left,
  right,
  compact = false,
}: {
  km: number;
  left: string;
  right: string;
  compact?: boolean;
}): ReactNode {
  /* Built in HTML rather than SVG on purpose: the rule has to stretch from
     335px to 900px without ever distorting a letterform or an end point.
     Ticks are a repeating gradient, so 1 km stays 1 km at every width. */
  const vars = {
    "--minor": `calc(100% / ${km})`,
    "--major": `calc(100% * 10 / ${km})`,
  } as CSSProperties;

  return (
    <figure
      className={compact ? `${s.reach} ${s.reachSmall}` : s.reach}
      style={vars}
      role="img"
      aria-label={`${km} kilometres from ${left} to the ${right}`}
    >
      <span className={s.reachValue}>{km} km</span>
      <span className={s.reachRule}>
        <span className={s.reachMinor} aria-hidden="true" />
        <span className={s.reachMajor} aria-hidden="true" />
        <span className={s.reachHere} aria-hidden="true" />
        <span className={s.reachThere} aria-hidden="true" />
      </span>
      <figcaption className={s.reachEnds}>
        <span>{left}</span>
        <span>{right}</span>
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------- *
 *  THE OTHER FOUR READOUTS. Each metric gets the instrument it deserves,
 *  not a fifth identical card.
 * -------------------------------------------------------------------- */

/** Silence — sixty seconds of measured ambient, and the mean across it. */
function SilenceStrip(): ReactNode {
  const rand = seeded(313);
  const bars = Array.from({ length: 34 }, () => 28.4 + rand() * 7.2);
  const toY = (db: number) => 46 - ((db - 20) / 50) * 40;

  return (
    <svg
      className={s.device}
      viewBox="0 0 260 52"
      role="img"
      aria-label="Ambient level, 32 decibels mean over sixty seconds"
    >
      <line x1="0" y1="46" x2="260" y2="46" stroke="#93b382" strokeWidth="1" opacity="0.16" />
      <line
        x1="0"
        y1={f1(toY(40))}
        x2="260"
        y2={f1(toY(40))}
        stroke="#7e9084"
        strokeWidth="1"
        strokeDasharray="1 5"
        opacity="0.45"
      />
      <text className={s.deviceTick} x="258" y={toY(40) - 4} textAnchor="end">
        40 · a reading room
      </text>
      <g stroke="#93b382" strokeWidth="2.4" opacity="0.62">
        {bars.map((db, i) => (
          <line
            key={i}
            x1={f1(4 + i * 7.6)}
            y1="46"
            x2={f1(4 + i * 7.6)}
            y2={f1(toY(db))}
            opacity={(0.42 + (db - 28) / 16).toFixed(2)}
          />
        ))}
      </g>
      <line
        x1="0"
        y1={f1(toY(32))}
        x2="260"
        y2={f1(toY(32))}
        stroke="#e9a85e"
        strokeWidth="1"
        opacity="0.72"
      />
    </svg>
  );
}

/** Signal — the absence, drawn. Four empty bars and a line through them. */
function SignalNone(): ReactNode {
  const bars = [10, 18, 26, 34];
  return (
    <svg
      className={s.device}
      viewBox="0 0 260 52"
      role="img"
      aria-label="No cellular signal"
    >
      <line x1="0" y1="46" x2="260" y2="46" stroke="#93b382" strokeWidth="1" opacity="0.16" />
      <g fill="none" stroke="#7e9084" strokeWidth="1" opacity="0.5">
        {bars.map((h, i) => (
          <rect key={i} x={6 + i * 18} y={46 - h} width="11" height={h} />
        ))}
      </g>
      <line x1="0" y1="49" x2="82" y2="9" stroke="#93b382" strokeWidth="1" opacity="0.85" />
      <text className={s.deviceTick} x="100" y="42">
        no cellular · no broadband
      </text>
      <text className={s.deviceTick} x="100" y="26" opacity="0.7">
        nearest mast 41 km
      </text>
    </svg>
  );
}

/** Dark sky — the Bortle scale as nine cells that get brighter and emptier. */
function BortleScale(): ReactNode {
  const cells = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const lum = Math.round(7 + t * 88);
    const stars = Math.max(0, 13 - i * 2);
    const rand = seeded(900 + i * 17);
    return {
      i,
      fill: `rgb(${lum}, ${Math.round(lum * 1.09 + 3)}, ${Math.round(lum * 0.97)})`,
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
      aria-label="Bortle class 2 of 9"
    >
      {cells.map((c) => {
        const x = 2 + c.i * 28.2;
        const active = c.i === 1;
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
            {active ? (
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
                  2
                </text>
              </>
            ) : null}
          </g>
        );
      })}
      <text className={s.deviceTick} x="0" y="50" opacity="0.6">
        1
      </text>
      <text className={s.deviceTick} x="260" y="50" textAnchor="end" opacity="0.6">
        9
      </text>
    </svg>
  );
}

/** Biome — what is actually standing around the house. */
function BiomeGlyph(): ReactNode {
  const d = band({ seed: 8, count: 15, base: 42, from: 2, to: 258, minH: 16, maxH: 36 });
  return (
    <svg
      className={s.device}
      viewBox="0 0 260 56"
      role="img"
      aria-label="Biome: old-growth spruce forest"
    >
      <path d={d} fill="#35513a" opacity="0.85" />
      <line x1="0" y1="45" x2="260" y2="45" stroke="#93b382" strokeWidth="1" opacity="0.28" />
      <text className={s.deviceTick} x="0" y="51.5" opacity="0.7">
        spruce · standing water · track ends 9 km short
      </text>
    </svg>
  );
}

/* -------------------------------------------------------------------- *
 *  CARD SCENES — the same media-slot contract at card size.
 * -------------------------------------------------------------------- */

type Biome = "forest" | "coast" | "alpine";

const SCENE_TONES: Record<Biome, { sky: [string, string]; ground: string; haze: string }> = {
  forest: { sky: ["#0a100c", "#212e24"], ground: "#080d09", haze: "rgba(168,192,172,0.14)" },
  coast: { sky: ["#08100e", "#1b2b26"], ground: "#060c0a", haze: "rgba(168,196,184,0.13)" },
  alpine: { sky: ["#0a0f0d", "#232e28"], ground: "#0a0f0d", haze: "rgba(190,206,192,0.14)" },
};

/** The same building, seen from further away. x/y is the ground line, left edge. */
function MiniHouse({
  uid,
  x,
  y,
  w,
}: {
  uid: string;
  x: number;
  y: number;
  w: number;
}): ReactNode {
  const h = w * 0.3;
  return (
    <g>
      <ellipse
        cx={f1(x + w / 2)}
        cy={f1(y - h * 0.3)}
        rx={f1(w * 0.78)}
        ry={f1(h * 1.15)}
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

function MiniScene({ kind, uid }: { kind: Biome; uid: string }): ReactNode {
  const tone = SCENE_TONES[kind];
  const far = band({ seed: 5 + uid.length, count: 22, base: 268, from: -20, to: 620, minH: 40, maxH: 96 });
  const near = band({ seed: 61 + uid.length, count: 16, base: 288, from: -30, to: 640, minH: 70, maxH: 150 });

  const ridge = (() => {
    const rand = seeded(1201);
    let d = "M-20 300";
    for (let x = -20; x <= 620; x += 20) {
      const y =
        250 -
        58 * Math.sin(x / 210 + 0.6) -
        22 * Math.sin(x / 88 + 2.1) -
        rand() * 6;
      d += `L${x} ${f1(y)}`;
    }
    return `${d}L620 300Z`;
  })();

  return (
    <svg
      className={s.mediaEl}
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
      <rect x="0" y="120" width="600" height="180" fill={`url(#${uid}-haze)`} />

      {kind === "forest" ? (
        <>
          <path d={far} fill="#25332a" opacity="0.55" filter={`url(#${uid}-b)`} />
          <MiniHouse uid={uid} x={344} y={252} w={92} />
          <path d={near} fill={tone.ground} />
        </>
      ) : null}

      {kind === "coast" ? (
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
          <MiniHouse uid={uid} x={368} y={195} w={78} />
          <path d="M138 238 L154 204 L172 238 Z" fill="#050a0b" />
          <path d="M192 248 L204 226 L218 248 Z" fill="#050a0b" opacity="0.8" />
        </>
      ) : null}

      {kind === "alpine" ? (
        <>
          <path d={ridge} fill="#222b26" opacity="0.9" filter={`url(#${uid}-b)`} />
          <path
            d="M-20 300 L-20 262 C120 244 220 270 320 258 C420 246 520 266 620 254 L620 300 Z"
            fill="#141b17"
          />
          <MiniHouse uid={uid} x={214} y={266} w={84} />
          <path
            d={band({ seed: 99, count: 11, base: 276, from: 320, to: 560, minH: 18, maxH: 44 })}
            fill="#0a0f0c"
          />
        </>
      ) : null}

      <rect x="0" y="0" width="600" height="300" fill={`url(#${uid}-vig)`} />
    </svg>
  );
}

/* -------------------------------------------------------------------- *
 *  CONTENT
 * -------------------------------------------------------------------- */

const NAV = [
  { label: "Houses", href: "#houses" },
  { label: "The Index", href: "#index" },
  { label: "Philosophy", href: "#index" },
  { label: "Journal", href: "#houses" },
];

type Metric = {
  label: string;
  value: string;
  unit?: string;
  note: string;
  device: "reach" | "silence" | "signal" | "bortle" | "biome";
};

const METRICS: Metric[] = [
  {
    label: "Solitude",
    value: "34",
    unit: "km",
    note: "To the nearest permanent dwelling — measured in the direction it is closest, not the one that flatters us.",
    device: "reach",
  },
  {
    label: "Silence",
    value: "32",
    unit: "dB",
    note: "Ambient, sixty seconds, instruments at 1.5 m on the lake side. Quiet enough that your own pulse becomes an event.",
    device: "silence",
  },
  {
    label: "Signal",
    value: "none",
    note: "There is a satellite handset in the drawer by the door. In four years no guest has taken it out of its case.",
    device: "signal",
  },
  {
    label: "Dark sky",
    value: "2",
    unit: "Bortle",
    note: "Class 2 of 9. On a clear night in February the Milky Way throws enough light to read the shoreline by.",
    device: "bortle",
  },
  {
    label: "Biome",
    value: "forest",
    note: "Old spruce that has never been cut, and black standing water that has never been drained. The track gives up nine kilometres short.",
    device: "biome",
  },
];

type Listing = {
  name: string;
  kind: Biome;
  biome: string;
  region: string;
  copy: string;
  price: string;
  stats: [string, string][];
};

const LISTINGS: Listing[] = [
  {
    name: "Blackwater 11",
    kind: "forest",
    biome: "Forest",
    region: "Kuusamo, Finland",
    copy: "Nine kilometres past the point where the plough turns around. Spruce on three sides, standing water on the fourth, and a stove that takes four hours to give up its heat.",
    price: "€310",
    stats: [
      ["Solitude", "22 km"],
      ["Silence", "31 dB"],
      ["Signal", "none"],
    ],
  },
  {
    name: "Tidebreak 03",
    kind: "coast",
    biome: "Coast",
    region: "Westfjords, Iceland",
    copy: "Bolted to basalt above a bay with no landing. The only thing that arrives here unannounced is weather, and it announces itself for hours first.",
    price: "€295",
    stats: [
      ["Solitude", "27 km"],
      ["Silence", "38 dB"],
      ["Signal", "weak"],
    ],
  },
  {
    name: "Whitehour 08",
    kind: "alpine",
    biome: "Alpine",
    region: "Sarek, Sweden",
    copy: "Two hundred metres above the last tree. From November the door opens inward, for reasons the previous door explained clearly and only once.",
    price: "€360",
    stats: [
      ["Solitude", "61 km"],
      ["Silence", "26 dB"],
      ["Signal", "none"],
    ],
  },
];

/* -------------------------------------------------------------------- *
 *  PAGE
 * -------------------------------------------------------------------- */

function Device({ metric }: { metric: Metric }): ReactNode {
  switch (metric.device) {
    case "reach":
      return <ReachLine km={34} left="Hollowmoss 04" right="nearest dwelling" compact />;
    case "silence":
      return <SilenceStrip />;
    case "signal":
      return <SignalNone />;
    case "bortle":
      return <BortleScale />;
    default:
      return <BiomeGlyph />;
  }
}

export default function ForestNocturnePage(): ReactNode {
  return (
    <main className={s.page}>
      {/* film grain, fixed like a lens rather than painted on the scene */}
      <svg className={s.grain} aria-hidden="true">
        <filter id="fn-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#fn-grain)" />
      </svg>

      {/* ============================== HERO ============================== */}
      <header className={s.hero} id="top">
        {/* MEDIA SLOT — swap the <svg> below for <img> or <video autoPlay muted
            loop playsInline> with the same className and nothing else moves. */}
        <div className={s.media}>
          <ForestScene />
        </div>
        <div className={s.scrim} aria-hidden="true" />

        <div className={s.frame}>
          <nav className={s.nav} aria-label="Primary">
            <a className={s.wordmark} href="#top">
              Stillnest
            </a>
            <ul className={s.navLinks}>
              {NAV.map((n) => (
                <li key={n.label}>
                  <a className={s.navLink} href={n.href}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
            <a className={s.reserve} href="#houses">
              Reserve
            </a>
          </nav>

          <div className={s.heroSpace} />

          <div className={s.heroFoot}>
            <h1 className={s.tagline}>
              <span>Nowhere.</span>
              <span>On purpose.</span>
            </h1>

            <p className={s.heroLede}>
              Twelve houses. None of them within sight of another.
            </p>

            <div className={s.reachBlock}>
              <ReachLine km={34} left="Hollowmoss 04" right="nearest lit window" />
              <p className={s.heroWhere}>
                <span>Jämtland, Sweden</span>
                <span>63°41′N 13°06′E · 21:40 · 3°C · fog</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ========================= SOLITUDE INDEX ========================= */}
      <section className={s.index} id="index">
        <div className={s.indexHead}>
          <p className={s.kicker}>The Solitude Index</p>
          <h2 className={s.h2}>
            Bedrooms have never once told anyone
            <em> how alone they were about to be.</em>
          </h2>
          <p className={s.lede}>
            Every house is surveyed on foot, after dark, before it is allowed onto the map.
            Five readings come back. We publish all five and nothing else — you search by
            distance, level and darkness, the way you would actually choose.
          </p>
        </div>

        <article className={s.panel}>
          <header className={s.panelHead}>
            <div>
              <h3 className={s.panelName}>Hollowmoss 04</h3>
              <p className={s.panelWhere}>Jämtland, Sweden · 63°41′N 13°06′E</p>
            </div>
            <p className={s.panelMeta}>
              <span>Surveyed 14 Nov · 02:47 local</span>
              <span>Instruments at 1.5 m, lake side</span>
            </p>
          </header>

          <ul className={s.metrics}>
            {METRICS.map((m) => (
              <li key={m.label} className={s.metric}>
                <p className={s.mLabel}>{m.label}</p>
                <p className={s.mValue}>
                  {m.value}
                  {m.unit ? <span className={s.mUnit}>{m.unit}</span> : null}
                </p>
                <div className={s.mDevice}>
                  <Device metric={m} />
                </div>
                <p className={s.mNote}>{m.note}</p>
              </li>
            ))}
          </ul>

          <footer className={s.panelFoot}>
            <span>Composite index</span>
            <span className={s.panelScore}>
              94<i>/100</i>
            </span>
            <span className={s.panelFootNote}>
              Higher is emptier. Nothing above 96 has a road to it.
            </span>
          </footer>
        </article>
      </section>

      {/* ============================= HOUSES ============================= */}
      <section className={s.houses} id="houses">
        <div className={s.housesHead}>
          <div>
            <p className={s.kicker}>Three of twelve</p>
            <h2 className={s.h2}>Unoccupied tonight.</h2>
          </div>
          <p className={s.housesNote}>
            Availability is thin on purpose. We keep twelve houses, and we have no
            intention of ever keeping thirteen.
          </p>
        </div>

        <ul className={s.cards}>
          {LISTINGS.map((h, i) => (
            <li key={h.name} className={s.card}>
              <a className={s.cardLink} href="#houses">
                <div className={s.cardMedia}>
                  <MiniScene kind={h.kind} uid={`fn-c${i}`} />
                  <span className={s.cardBiome}>{h.biome}</span>
                </div>
                <div className={s.cardBody}>
                  <h3 className={s.cardName}>{h.name}</h3>
                  <p className={s.cardRegion}>{h.region}</p>
                  <p className={s.cardCopy}>{h.copy}</p>
                  <dl className={s.cardStats}>
                    {h.stats.map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className={s.cardPrice}>
                    {h.price}
                    <i>&nbsp;/ night</i>
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className={s.footer}>
        <span className={s.footMark}>Stillnest</span>
        <span className={s.footLine}>Nowhere. On purpose.</span>
        <span className={s.footNote}>
          Concept project. These houses are fictional and cannot be rented.
        </span>
      </footer>
    </main>
  );
}
