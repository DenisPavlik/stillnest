import type { ReactNode } from "react";

import type { StayCard as StayCardRow } from "@/lib/db/queries";
import { formatKm, formatPriceUsd } from "@/lib/format";
import { hashSeed } from "@/components/scene/geometry";
import { MiniScene } from "@/components/scene/mini-scene";
import { BIOME_LABEL } from "@/components/solitude/readings";

import s from "./stay-card.module.css";

/* -------------------------------------------------------------------- *
 *  STAY CARD — one house in a grid of houses.
 *
 *  The three stats under the copy are always the same three, in the same
 *  order, because the point of the card is that you can compare houses on
 *  distance rather than on how good the photograph was.
 *
 *  The media is a slot: today a generated biome scene, in Phase 9 an
 *  <img src={mediaUrl(stay.posterPath)} className={s.mediaEl}> in exactly
 *  the same box. `posterPath` is deliberately ignored until the files
 *  behind those keys actually exist.
 * -------------------------------------------------------------------- */

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
          <MiniScene
            biome={stay.biome}
            uid={`sc-${stay.slug}`}
            seed={hashSeed(stay.slug) % 4096}
            className={s.mediaEl}
          />
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
