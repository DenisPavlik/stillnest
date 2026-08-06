import type { ReactNode } from "react";

import type { Biome } from "@/lib/db/queries";

import { band, f1, ridge, seeded, spruce, trunk } from "./geometry";
import s from "./stay-scene.module.css";

/* ==================================================================== *
 *  THE STAY HERO SCENE — one house, in its own country, at dusk.
 *
 *  Same media-slot contract as the home hero: viewBox 1400×1000, sliced
 *  like `object-fit: cover`, so the Phase 9 swap for
 *  <video className={s.mediaEl}> moves nothing.
 *
 *  Two rules it exists to obey:
 *
 *  1. A desert stay must not look like a spruce forest. Six biomes, five
 *     archetypes, and a different foreground device in each — what frames
 *     the picture is what actually grows there.
 *  2. The house is roughly a tenth of the frame. Distance is sold by how
 *     small the lit window is against the dark; scale it up and the page
 *     starts selling a cabin instead of the absence of everyone else.
 *
 *  THE SKY IS DATA. Star density comes from the stay's measured Bortle
 *  class, and the Milky Way only shows up on the classes dark enough to
 *  have one. A Bortle 1 house has a visibly different sky from a Bortle 4
 *  house, in the picture, before anyone has read a number.
 *
 *  Everything is seeded off the slug: server and browser draw the same
 *  trees, forever, and two highland houses never draw the same ridge.
 * ==================================================================== */

const W = 1400;
const H = 1000;

type Archetype = "forest" | "grove" | "coast" | "ridge" | "plain";

interface Tone {
  archetype: Archetype;
  /** Sky stops, top to horizon. */
  sky: readonly [string, string, string];
  /** How much of the sky survives the local air — haze eats stars. */
  clarity: number;
  ground: string;
  fog: string;
}

const TONES: Record<Biome, Tone> = {
  forest: {
    archetype: "forest",
    sky: ["#060a07", "#131c15", "#3a4c38"],
    clarity: 0.34,
    ground: "#080d09",
    fog: "rgba(196,208,180,0.22)",
  },
  bamboo: {
    archetype: "grove",
    sky: ["#060b08", "#141f14", "#37472c"],
    clarity: 0.3,
    ground: "#070d08",
    fog: "rgba(198,212,172,0.2)",
  },
  coast: {
    archetype: "coast",
    sky: ["#060c0b", "#101c1b", "#2c4441"],
    clarity: 0.72,
    ground: "#060b0a",
    fog: "rgba(180,204,198,0.17)",
  },
  highland: {
    archetype: "ridge",
    sky: ["#070c0a", "#121b18", "#2e3c33"],
    clarity: 0.92,
    ground: "#0a100c",
    fog: "rgba(190,206,192,0.15)",
  },
  snow: {
    archetype: "ridge",
    sky: ["#070d10", "#111c20", "#2b3a3b"],
    clarity: 0.86,
    ground: "#0e1618",
    fog: "rgba(202,216,214,0.2)",
  },
  desert: {
    archetype: "plain",
    sky: ["#06080a", "#0f1210", "#2a2a1e"],
    clarity: 1,
    ground: "#0a0a08",
    fog: "rgba(206,192,158,0.12)",
  },
};

/* -------------------------------------------------------------------- *
 *  THE HOUSE — dark timber, one lit floor, a roof that overhangs.
 *
 *  Three forms, because the buildings in the catalog are not the same
 *  building: a cabin under a forest, a long low bar on gravel, and a
 *  turf-roofed thing bolted to rock.
 * -------------------------------------------------------------------- */

type HouseForm = "cabin" | "bar" | "turf";

const FORM: Record<HouseForm, { ratio: number; roof: number; chimney: boolean }> = {
  cabin: { ratio: 0.42, roof: 0.055, chimney: true },
  bar: { ratio: 0.19, roof: 0.032, chimney: false },
  turf: { ratio: 0.34, roof: 0.085, chimney: true },
};

function House({
  uid,
  x,
  y,
  w,
  form = "cabin",
}: {
  uid: string;
  /** Left edge, in viewBox units. */
  x: number;
  /** The ground line the house stands on. */
  y: number;
  w: number;
  form?: HouseForm;
}): ReactNode {
  const { ratio, roof, chimney } = FORM[form];
  const h = w * ratio;
  const roofH = w * roof;

  return (
    <g>
      {/* the warm air around the building, before anything solid */}
      <ellipse
        cx={f1(x + w / 2)}
        cy={f1(y - h * 0.5)}
        rx={f1(w * 1.5)}
        ry={f1(w * 0.95)}
        fill={`url(#${uid}-warm)`}
      />

      {/* plinth: the house never sits flat on the ground */}
      <rect
        x={f1(x + w * 0.05)}
        y={f1(y - h * 0.1)}
        width={f1(w * 0.9)}
        height={f1(h * 0.16)}
        fill="#121813"
      />

      <rect x={f1(x)} y={f1(y - h)} width={f1(w)} height={f1(h)} fill="#0a0e0b" />

      {/* the lit floor */}
      <rect
        x={f1(x + w * 0.09)}
        y={f1(y - h * 0.86)}
        width={f1(w * 0.6)}
        height={f1(h * 0.48)}
        fill={`url(#${uid}-glass)`}
      />
      <g fill="#0a0e0b" opacity="0.9">
        {[0.24, 0.4, 0.56].map((t) => (
          <rect
            key={t}
            x={f1(x + w * t)}
            y={f1(y - h * 0.86)}
            width={f1(w * 0.012)}
            height={f1(h * 0.48)}
          />
        ))}
      </g>
      {/* one smaller window, dimmer — nobody lights a whole house */}
      <rect
        x={f1(x + w * 0.76)}
        y={f1(y - h * 0.78)}
        width={f1(w * 0.13)}
        height={f1(h * 0.3)}
        fill={`url(#${uid}-glass)`}
        opacity="0.5"
      />

      {/* roof slab, overhanging on both sides */}
      <rect
        x={f1(x - w * 0.07)}
        y={f1(y - h - roofH)}
        width={f1(w * 1.14)}
        height={f1(roofH)}
        fill={form === "turf" ? "#101710" : "#090d0a"}
      />
      <rect
        x={f1(x - w * 0.07)}
        y={f1(y - h - roofH)}
        width={f1(w * 1.14)}
        height="1.2"
        fill="#37432f"
        opacity="0.5"
      />
      {chimney ? (
        <rect
          x={f1(x + w * 0.78)}
          y={f1(y - h - roofH - w * 0.09)}
          width={f1(w * 0.055)}
          height={f1(w * 0.09)}
          fill="#0a0e0b"
        />
      ) : null}

      {/* what the window throws onto the ground */}
      <ellipse
        cx={f1(x + w * 0.4)}
        cy={f1(y + h * 0.12)}
        rx={f1(w * 0.72)}
        ry={f1(w * 0.1)}
        fill="rgba(226,158,84,0.22)"
        filter={`url(#${uid}-soft)`}
      />
    </g>
  );
}

/* -------------------------------------------------------------------- *
 *  Seeded scatters — stars, snowfall, stones.
 * -------------------------------------------------------------------- */

interface Speck {
  x: number;
  y: number;
  r: number;
  o: number;
}

function scatter(
  seed: number,
  count: number,
  box: readonly [number, number, number, number],
  maxR: number,
): Speck[] {
  const rand = seeded(seed);
  const [x0, y0, w, h] = box;
  return Array.from({ length: count }, () => ({
    x: x0 + rand() * w,
    y: y0 + rand() * h,
    r: 0.6 + Math.pow(rand(), 2.2) * maxR,
    o: 0.14 + Math.pow(rand(), 1.6) * 0.7,
  }));
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
}): string {
  const rand = seeded(o.seed);
  const span = o.to - o.from;
  let d = "";
  for (let i = 0; i < o.count; i += 1) {
    const x = o.from + (span * (i + rand() * 0.6)) / o.count;
    const h = o.minH + Math.pow(rand(), 1.2) * (o.maxH - o.minH);
    const lean = (rand() - 0.5) * o.width * 3.2;
    const w = o.width * (0.7 + rand() * 0.6);
    const top = o.base - h;
    d += [
      `M${f1(x - w / 2)} ${f1(o.base)}`,
      `L${f1(x + w / 2)} ${f1(o.base)}`,
      `L${f1(x + lean + w * 0.34)} ${f1(top)}`,
      `L${f1(x + lean - w * 0.34)} ${f1(top)}`,
      "Z",
    ].join("");
  }
  return d;
}

/**
 * How many stars the survey earns. Bortle 1 is a sky with structure in it;
 * Bortle 4 is constellations and not much between them. Local air takes its
 * cut on top — a fogged spruce forest under a class 2 sky still shows less
 * than a desert does.
 */
function starCount(bortle: number, clarity: number): number {
  const b = Math.min(9, Math.max(1, Math.round(bortle)));
  return Math.round((14 + (9 - b) * 30) * clarity);
}

export interface StaySceneProps {
  biome: Biome;
  /** Bortle class of this stay — it decides the sky, literally. */
  bortle: number;
  /** Per-house seed, from the slug. Same seed, same picture, forever. */
  seed: number;
  /** Prefix for every gradient and filter id. Unique per instance. */
  uid: string;
  /** The media-slot class from the calling layout. */
  className?: string;
}

export function StayScene({
  biome,
  bortle,
  seed,
  uid,
  className,
}: StaySceneProps): ReactNode {
  const tone = TONES[biome];

  /* Composition jitter. Everything stays inside x 470–930 so the 375px
     crop — which sees roughly the middle 540 units — still lands on the
     house. */
  const vary = seeded(seed + 4409);
  const shift = (vary() - 0.5) * 90;
  const scale = 0.9 + vary() * 0.24;
  const crest = 470 + (vary() - 0.5) * 70;
  const amp = 100 * (0.7 + vary() * 0.6);

  const stars = scatter(seed + 17, starCount(bortle, tone.clarity), [0, 0, W, 660], 1.5);
  const milkyWay = bortle <= 2 && tone.clarity > 0.6;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={tone.sky[0]} />
          <stop offset="46%" stopColor={tone.sky[1]} />
          <stop offset="100%" stopColor={tone.sky[2]} />
        </linearGradient>
        <linearGradient id={`${uid}-fog`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor={tone.fog} />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2ac6c" stopOpacity="0.66" />
          <stop offset="60%" stopColor="#a86f30" stopOpacity="0.46" />
          <stop offset="100%" stopColor="#4e3315" stopOpacity="0.34" />
        </linearGradient>
        <radialGradient id={`${uid}-warm`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(233,168,94,0.26)" />
          <stop offset="50%" stopColor="rgba(214,140,66,0.07)" />
          <stop offset="100%" stopColor="rgba(214,140,66,0)" />
        </radialGradient>
        <linearGradient id={`${uid}-sea`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18292b" />
          <stop offset="55%" stopColor="#0d1a1b" />
          <stop offset="100%" stopColor="#081112" />
        </linearGradient>
        <radialGradient id={`${uid}-band`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(214,224,232,0.16)" />
          <stop offset="60%" stopColor="rgba(190,204,216,0.05)" />
          <stop offset="100%" stopColor="rgba(190,204,216,0)" />
        </radialGradient>
        <radialGradient id={`${uid}-vig`} cx="52%" cy="44%" r="74%">
          <stop offset="42%" stopColor="rgba(4,7,5,0)" />
          <stop offset="100%" stopColor="rgba(4,7,5,0.84)" />
        </radialGradient>
        <filter id={`${uid}-far`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={`${uid}-mid`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`${uid}-near`} x="-16%" y="-16%" width="132%" height="132%">
          <feGaussianBlur stdDeviation="5.4" />
        </filter>
        <filter id={`${uid}-soft`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>

      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-sky)`} />

      {milkyWay ? (
        <ellipse
          cx="820"
          cy="250"
          rx="760"
          ry="180"
          fill={`url(#${uid}-band)`}
          transform="rotate(-19 820 250)"
        />
      ) : null}

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

      <rect x="0" y="300" width={W} height={H - 300} fill={`url(#${uid}-fog)`} />

      {/* =============================== FOREST ============================== */}
      {tone.archetype === "forest" ? (
        <>
          <path
            d={band({ seed, count: 70, base: 664, from: -60, to: 1460, minH: 70, maxH: 160 })}
            fill="#33443a"
            opacity="0.46"
            filter={`url(#${uid}-far)`}
          />
          <path
            d={band({
              seed: seed + 61,
              count: 46,
              base: 676,
              from: -80,
              to: 1480,
              minH: 130,
              maxH: 260,
            })}
            fill="#1a241d"
            opacity="0.94"
            filter={`url(#${uid}-mid)`}
          />
          <g className={s.drift}>
            <ellipse
              cx="700"
              cy="612"
              rx="800"
              ry="78"
              fill="rgba(196,208,180,0.12)"
              filter={`url(#${uid}-near)`}
            />
          </g>
          <House uid={uid} x={628 + shift} y={708} w={172 * scale} />
          {/* the near ring stops short of the clearing — that gap is the house */}
          <path
            d={band({
              seed: seed + 43,
              count: 14,
              base: 726,
              from: -110,
              to: 560,
              minH: 230,
              maxH: 440,
            })}
            fill={tone.ground}
          />
          <path
            d={band({
              seed: seed + 79,
              count: 13,
              base: 726,
              from: 1000,
              to: 1510,
              minH: 230,
              maxH: 450,
            })}
            fill={tone.ground}
          />
          <path
            d="M-20 1000 L-20 726 C240 712 420 738 700 730 C960 722 1180 742 1420 728 L1420 1000 Z"
            fill="#050806"
          />
          <g fill="#040604">
            <path d={trunk(74, 96, 58, -20, 1020, 24)} filter={`url(#${uid}-near)`} />
            <path d={trunk(1330, 108, 66, -20, 1020, -30)} filter={`url(#${uid}-near)`} />
            <path
              d={trunk(438, 30, 18, -20, 760, 8)}
              opacity="0.7"
              filter={`url(#${uid}-mid)`}
            />
          </g>
          <g fill="#050806" filter={`url(#${uid}-mid)`}>
            <g transform="translate(96,-80) rotate(126)">
              <path d={spruce(0, 0, 470, seeded(seed + 5))} />
            </g>
            <g transform="translate(1320,-64) rotate(-124)">
              <path d={spruce(0, 0, 420, seeded(seed + 31))} />
            </g>
          </g>
        </>
      ) : null}

      {/* ================================ GROVE ============================== */}
      {tone.archetype === "grove" ? (
        <>
          <path
            d={culms({
              seed: seed + 3,
              count: 58,
              from: -40,
              to: 1440,
              base: 740,
              minH: 380,
              maxH: 640,
              width: 7,
            })}
            fill="#2b3a26"
            opacity="0.5"
            filter={`url(#${uid}-far)`}
          />
          <g className={s.drift}>
            <ellipse
              cx="720"
              cy="640"
              rx="820"
              ry="86"
              fill="rgba(198,212,172,0.1)"
              filter={`url(#${uid}-near)`}
            />
          </g>
          <House uid={uid} x={640 + shift} y={742} w={152 * scale} />
          <path
            d="M-20 1000 L-20 748 C260 736 500 758 760 750 C1010 742 1200 760 1420 748 L1420 1000 Z"
            fill={tone.ground}
          />
          {/* Near culms: almost black, and they read as bars across the frame.
              Both dark layers stop short of the middle — a grove this thick
              would hide the house completely, and the lit window is the one
              thing in the picture that has to survive. */}
          {[
            { from: -40, to: 560 + shift },
            { from: 900 + shift, to: 1440 },
          ].map((span, i) => (
            <path
              key={`near-${i}`}
              d={culms({
                seed: seed + 29 + i * 7,
                count: 11,
                from: span.from,
                to: span.to,
                base: 780,
                minH: 620,
                maxH: 1020,
                width: 15,
              })}
              fill="#060b07"
              filter={`url(#${uid}-mid)`}
            />
          ))}
          {[
            { from: -60, to: 500 + shift },
            { from: 960 + shift, to: 1460 },
          ].map((span, i) => (
            <path
              key={`front-${i}`}
              d={culms({
                seed: seed + 131 + i * 13,
                count: 4,
                from: span.from,
                to: span.to,
                base: 820,
                minH: 900,
                maxH: 1120,
                width: 30,
              })}
              fill="#040705"
              filter={`url(#${uid}-near)`}
            />
          ))}
        </>
      ) : null}

      {/* ================================ COAST ============================== */}
      {tone.archetype === "coast" ? (
        <>
          {/* The sea is a band, not a corner. An earlier version put the
              headland across the left half and the water off the edge of the
              375px crop — on a phone the whole sea disappeared and the house
              stood on a black nothing. The horizon now runs the full width at
              every breakpoint. */}
          <rect x="0" y="556" width={W} height="220" fill={`url(#${uid}-sea)`} />
          <rect x="0" y="552" width={W} height="4" fill="#5c8380" opacity="0.4" />
          <g stroke="#a9c4c8" strokeWidth="1.4" fill="none">
            {[574, 596, 622, 654, 692, 734].map((y, i) => (
              <line
                key={y}
                x1={f1(40 + i * 60)}
                y1={y}
                x2={f1(W - 30 - i * 46)}
                y2={y}
                opacity={(0.2 - i * 0.026).toFixed(3)}
              />
            ))}
          </g>
          {/* Sea stacks, inside the narrow crop. Blunt-topped columns, not
              points — a pointed silhouette on this site means a spruce, and
              there is not a tree within sixty kilometres of a stack. */}
          <g fill="#050a0b">
            <path d="M330 726 L340 514 L366 508 L378 726 Z" />
            <path d="M394 726 L401 598 L416 594 L424 726 Z" opacity="0.82" />
            <path d="M1050 726 L1060 542 L1084 536 L1096 726 Z" opacity="0.7" />
          </g>
          {/* the cliff top: the last flat ground before the drop */}
          <path
            d="M-20 1000 L-20 786 C160 762 300 742 520 730 C760 718 1000 726 1420 716 L1420 1000 Z"
            fill={tone.ground}
          />
          <path
            d="M-20 786 C160 762 300 742 520 730 C760 718 1000 726 1420 716"
            fill="none"
            stroke="#8fb0aa"
            strokeWidth="1.4"
            opacity="0.2"
          />
          <House uid={uid} x={646 + shift} y={726} w={162 * scale} form="turf" />
          {/* spray, sixty metres down and out of sight, lit from the sky */}
          <ellipse
            cx="240"
            cy="782"
            rx="260"
            ry="34"
            fill="rgba(180,204,198,0.1)"
            filter={`url(#${uid}-near)`}
          />
          <path
            d="M-20 1000 L-20 902 C180 872 360 924 560 952 L640 1000 Z"
            fill="#030605"
          />
        </>
      ) : null}

      {/* ================================ RIDGE ============================== */}
      {tone.archetype === "ridge" ? (
        <>
          <path
            d={ridge({
              seed: seed + 1201,
              from: -40,
              to: 1440,
              base: 1000,
              crest,
              amplitude: amp,
            })}
            fill={biome === "snow" ? "#2c3a3d" : "#26332c"}
            opacity="0.72"
            filter={`url(#${uid}-far)`}
          />
          <path
            d={ridge({
              seed: seed + 77,
              from: -40,
              to: 1440,
              base: 1000,
              crest: crest + 110,
              amplitude: amp * 0.72,
            })}
            fill={biome === "snow" ? "#1b262a" : "#18211b"}
            opacity="0.92"
            filter={`url(#${uid}-mid)`}
          />
          <g className={s.drift}>
            <ellipse
              cx="680"
              cy="660"
              rx="820"
              ry="72"
              fill="rgba(202,216,214,0.11)"
              filter={`url(#${uid}-near)`}
            />
          </g>
          {/* the shelf the house stands on */}
          <path
            d="M-20 1000 L-20 742 C220 716 420 754 700 742 C960 730 1180 758 1420 738 L1420 1000 Z"
            fill={tone.ground}
          />
          <House uid={uid} x={646 + shift} y={744} w={150 * scale} />
          {biome === "snow" ? (
            <>
              <g stroke="#c9d7d4" strokeWidth="1.6" fill="none">
                {[790, 838, 894, 958].map((y, i) => (
                  <path
                    key={y}
                    d={`M-20 ${y} C300 ${y - 20 - i * 6} 780 ${y + 16} 1420 ${y - 8}`}
                    opacity={(0.15 - i * 0.02).toFixed(2)}
                  />
                ))}
              </g>
              {/* falling snow, in front of everything */}
              <g fill="#dbe6e2">
                {scatter(seed + 303, 90, [0, 300, W, 700], 1.2).map((sp, i) => (
                  <circle
                    key={i}
                    cx={f1(sp.x)}
                    cy={f1(sp.y)}
                    r={sp.r.toFixed(2)}
                    opacity={(sp.o * 0.5).toFixed(2)}
                  />
                ))}
              </g>
            </>
          ) : (
            <>
              {/* highland: the last low scrub before the ground gives up */}
              <path
                d={band({
                  seed: seed + 99,
                  count: 16,
                  base: 772,
                  from: 880 + shift,
                  to: 1440,
                  minH: 26,
                  maxH: 62,
                })}
                fill="#080d09"
              />
              <path
                d="M-20 1000 L-20 856 C180 824 360 884 560 906 C760 928 980 902 1420 872 L1420 1000 Z"
                fill="#050806"
              />
            </>
          )}
        </>
      ) : null}

      {/* ================================ PLAIN ============================== */}
      {tone.archetype === "plain" ? (
        <>
          {/* nothing stands up out here, so the horizon does all the work */}
          <path
            d={ridge({
              seed: seed + 511,
              from: -40,
              to: 1440,
              base: 1000,
              crest: 636,
              amplitude: 26,
            })}
            fill="#22221a"
            opacity="0.85"
            filter={`url(#${uid}-far)`}
          />
          <path
            d={ridge({
              seed: seed + 907,
              from: -40,
              to: 1440,
              base: 1000,
              crest: 700,
              amplitude: 12,
            })}
            fill="#141410"
            filter={`url(#${uid}-mid)`}
          />
          <rect x="0" y="736" width={W} height={H - 736} fill={tone.ground} />
          <House uid={uid} x={596 + shift} y={738} w={228 * scale} form="bar" />
          <g fill="#191913">
            {scatter(seed + 71, 60, [0, 742, W, 258], 3).map((sp, i) => (
              <ellipse
                key={i}
                cx={f1(sp.x)}
                cy={f1(sp.y)}
                rx={f1(sp.r * 7)}
                ry={f1(sp.r * 2.4)}
                opacity={(sp.o * 0.8).toFixed(2)}
              />
            ))}
          </g>
          <path
            d="M-20 1000 L-20 918 C260 900 520 938 820 946 C1080 952 1240 930 1420 918 L1420 1000 Z"
            fill="#070706"
          />
        </>
      ) : null}

      <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-vig)`} />
    </svg>
  );
}
