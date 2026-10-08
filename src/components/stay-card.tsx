import type { ReactNode } from "react";

import type { StayCard as StayCardRow } from "@/lib/db/queries";
import { formatKm, formatPriceUsd } from "@/lib/format";
import { hasPhotography } from "@/lib/media";
import { hashSeed } from "@/components/scene/geometry";
import { MiniScene } from "@/components/scene/mini-scene";
import { BIOME_LABEL, biomeSetting } from "@/components/solitude/readings";
import { Still } from "@/components/still";

import s from "./stay-card.module.css";

/* -------------------------------------------------------------------- *
 *  STAY CARD — one house in a grid of houses.
 *
 *  The three stats under the copy are always the same three, in the same
 *  order, because the point of the card is that you can compare houses on
 *  distance rather than on how good the photograph was.
 *
 *  The media is a slot, and which of the two fills it is decided per
 *  house by `hasPhotography`: a real exterior once its files exist, the
 *  generated biome scene until then. `posterPath` on the row is still
 *  ignored — the seed wrote a poster key for all twelve in Phase 2, so it
 *  says nothing about whether a file is behind it.
 *
 *  Phase 9 runs one house at a time, so a mixed grid is the normal state
 *  for as long as it takes rather than a moment in a deploy. Both fills
 *  take the same box, the same `object-fit: cover` and the same hover
 *  scale, which is what keeps the mixture reading as deliberate.
 * -------------------------------------------------------------------- */

/**
 * A card is one column of a grid that is at most 1360px across and never
 * wider than three columns, so ~440px is the ceiling. Without this the
 * browser assumes the full viewport and picks the 3072 rung.
 */
const CARD_SIZES = "(max-width: 640px) 92vw, (max-width: 1040px) 46vw, 440px";

/** The subset of a stay a card needs — `listStays` and `featuredStays` rows both fit. */
export type StayCardStay = Pick<
  StayCardRow,
  | "slug"
  | "name"
  | "tagline"
  | "biome"
  | "country"
  | "region"
  | "basePriceCents"
  | "solitudeKm"
  | "noiseDb"
  | "connectivity"
  | "bortle"
>;

export interface StayCardProps {
  stay: StayCardStay;
  /** Defaults to the stay's own page. */
  href?: string;
}

export function StayCard({ stay, href }: StayCardProps): ReactNode {
  const stats: [string, string][] = [
    ["Solitude", `${formatKm(stay.solitudeKm)} km`],
    ["Silence", `${stay.noiseDb} dB`],
    ["Signal", stay.connectivity],
  ];

  return (
    <li className={s.card}>
      <a className={s.link} href={href ?? `/stays/${stay.slug}`}>
        <div className={s.media}>
          {hasPhotography(stay.slug) ? (
            <Still
              className={s.mediaEl}
              base={`stays/${stay.slug}/exterior`}
              alt={`${stay.name} at dusk — a low timber house lit from within, alone in ${biomeSetting(stay.biome)}.`}
              sizes={CARD_SIZES}
            />
          ) : (
            <MiniScene
              biome={stay.biome}
              uid={`sc-${stay.slug}`}
              seed={hashSeed(stay.slug) % 4096}
              className={s.mediaEl}
            />
          )}
          <span className={s.biome}>{BIOME_LABEL[stay.biome]}</span>
        </div>
        <div className={s.body}>
          {/* Grouped so the card can give this block the leftover height and
              leave the readings and the price on a shared baseline across a
              row. A tagline of one line versus two must not move a price. */}
          <div className={s.bodyTop}>
            <h3 className={s.name}>{stay.name}</h3>
            <p className={s.region}>
              {stay.region}, {stay.country}
            </p>
            {stay.tagline ? <p className={s.copy}>{stay.tagline}</p> : null}
          </div>
          <dl className={s.stats}>
            {stats.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className={s.price}>
            {formatPriceUsd(stay.basePriceCents)}
            <i>&nbsp;/ night</i>
          </p>
        </div>
      </a>
    </li>
  );
}
