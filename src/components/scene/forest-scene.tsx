import type { ReactNode } from "react";

import { band, f1, seeded, spruce, trunk } from "./geometry";
import s from "./forest-scene.module.css";

/* ==================================================================== *
 *  THE HERO SCENE — spruce at dusk, one lit window, and its double in
 *  still black water.
 *
 *  This is a MEDIA SLOT filler, not decoration. It renders under exactly
 *  the rules an <img> or <video> would obey (fill the box, crop from the
 *  centre), so when real footage lands in Phase 9 the swap is one line
 *  and the layout does not move.
 *
 *  viewBox 1400×1000, "slice" so it behaves like object-fit: cover. The
 *  composition is kept inside the central band so the 375px crop still
 *  lands on the house.
 * ==================================================================== */

const WATERLINE = 658;

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

export interface ForestSceneProps {
  /** The media-slot class from the calling layout — this element IS the media. */
  className?: string;
  /** Prefix for every gradient, filter and mask id. Unique per instance. */
  uid?: string;
}

export function ForestScene({ className, uid = "fn-hero" }: ForestSceneProps): ReactNode {
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
      className={className}
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
