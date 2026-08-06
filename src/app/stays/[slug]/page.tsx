import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AmenityIcon } from "@/components/amenity-icon";
import { FilmGrain } from "@/components/film-grain";
import { hashSeed } from "@/components/scene/geometry";
import { StayScene } from "@/components/scene/stay-scene";
import { SectionHead } from "@/components/section-head";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { SolitudeIndex } from "@/components/solitude";
import { BIOME_LABEL, SOLITUDE_NOTE, biomeGround } from "@/components/solitude/readings";
import { StayCard } from "@/components/stay-card";
import { allStaySlugs, featuredStays, getStayBySlug } from "@/lib/db/queries";
import {
  capitalise,
  formatClosedRange,
  formatCoords,
  formatKm,
  formatPriceEur,
  numberWord,
} from "@/lib/format";

import s from "./stay.module.css";

/* ==================================================================== *
 *  ONE HOUSE.
 *
 *  The order of this page is the argument the whole product makes: the
 *  measurements come BEFORE the rooms. A booking site opens with bedrooms
 *  and a price because that is what it sells; this one opens with how far
 *  away everyone else is, because that is what it sells.
 *
 *  The hero is a MEDIA SLOT, exactly as on the home page. The generated
 *  scene inside it obeys the rules an <img> or a looping <video> would,
 *  so the Phase 9 swap is one line and nothing moves.
 *
 *  Nothing on this page pretends to be bookable. Dates and pricing belong
 *  to Phases 4 and 5; until then the reserve control is disabled and says
 *  what it is, on the one page where a visitor would most want to believe
 *  otherwise.
 * ==================================================================== */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await allStaySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/stays/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stay = await getStayBySlug(slug);

  if (!stay) return { title: "House not found — Stillnest" };

  const readings = `${formatKm(stay.solitudeKm)} km to the nearest dwelling · ${stay.noiseDb} dB measured · Bortle ${stay.bortle} · ${stay.connectivity} signal.`;

  return {
    title: `${stay.name} — ${stay.region}, ${stay.country} · Stillnest`,
    description: `${stay.tagline ? `${stay.tagline} ` : ""}${readings} A concept project: this house is fictional and cannot be rented.`,
  };
}

/** Plain language for a blackout. The database stores three reasons; a guest
    reading this page deserves the sentence, not the enum. */
const BLOCK_REASON: Record<string, string> = {
  maintenance: "Work on the house.",
  owner: "Closed by the owner.",
  hold: "Held, not yet released.",
};

/** "three nights" · "one night". The column is a smallint and nothing stops it
    being 1, so the copy does not assume the plural. */
function nights(n: number): string {
  return `${numberWord(n)} night${n === 1 ? "" : "s"}`;
}

/** "two bedrooms" · "one bedroom". */
function bedrooms(n: number): string {
  return `${numberWord(n)} bedroom${n === 1 ? "" : "s"}`;
}

export default async function StayPage({
  params,
}: PageProps<"/stays/[slug]">): Promise<ReactNode> {
  const { slug } = await params;
  const stay = await getStayBySlug(slug);

  if (!stay) notFound();

  const others = await featuredStays(3, slug);

  /* One seed per house: the hero scene, and the sixty-second silence trace
     in the panel, are both drawn from it. Same house, same picture, forever. */
  const seed = hashSeed(stay.slug) % 4096;
  const where = `${stay.region}, ${stay.country}`;
  const coords = formatCoords(stay.lat, stay.lng);
  const paragraphs = stay.description
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  /* The exterior scene's caption is real data and describes the shot that
     lands here in Phase 9. The picture under it is not that shot yet, and
     the line says so rather than letting anyone assume otherwise. */
  const exterior = stay.scenes.find((scene) => scene.kind === "exterior");

  return (
    <main className={s.page}>
      <FilmGrain />

      {/* ============================== HERO ============================== */}
      <header className={s.hero}>
        {/* MEDIA SLOT — swap <StayScene> for <img> or <video autoPlay muted
            loop playsInline> with the same className and nothing moves. */}
        <div className={s.media}>
          <StayScene
            biome={stay.biome}
            bortle={stay.bortle}
            seed={seed}
            uid={`sh-${stay.slug}`}
            className={s.mediaEl}
          />
        </div>
        <div className={s.scrim} aria-hidden="true" />

        <div className={s.frame}>
          <SiteNav reserveHref="#reserve" />

          <div className={s.heroSpace} />

          <div className={s.heroFoot}>
            <p className={s.eyebrow}>
              <span>{BIOME_LABEL[stay.biome]}</span>
              <span>{where}</span>
            </p>

            <h1 className={s.title}>{stay.name}</h1>

            {stay.tagline ? <p className={s.lede}>{stay.tagline}</p> : null}

            <p className={s.heroMeta}>
              <span>{coords}</span>
              <span>Sleeps {numberWord(stay.capacity)}</span>
              <span>
                {formatPriceEur(stay.basePriceCents)} / night · {nights(stay.minNights)}{" "}
                minimum
              </span>
            </p>
          </div>
        </div>

        <p className={s.mediaNote}>
          {exterior?.caption ?? `${stay.name}, from the approach`} · generated stand-in
        </p>
      </header>

      {/* ========================= SOLITUDE INDEX ========================= */}
      <section className={`${s.section} ${s.survey}`} id="index">
        <SectionHead
          variant="split"
          kicker="The Solitude Index"
          title="What the survey found."
          aside="Five readings, taken on foot before the house was allowed onto the map. None of them is an estimate, and none of them is a photograph of a good day."
        />

        <SolitudeIndex
          className={s.panel}
          name={stay.name}
          where={`${where} · ${coords}`}
          readings={stay}
          seed={seed}
        />
      </section>

      {/* ============================ THE HOUSE =========================== */}
      <section className={s.section} id="house">
        <SectionHead
          variant="split"
          kicker="The house"
          title="What is actually here."
          aside={`Sleeps ${numberWord(stay.capacity)} in ${bedrooms(stay.bedrooms)}. ${capitalise(nights(stay.minNights))} minimum — anything shorter is a drive, not a stay.`}
        />

        <div className={s.houseGrid}>
          <div className={s.prose}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}

            <h3 className={s.subhead}>What is in it</h3>
            <ul className={s.amenities}>
              {stay.amenities.map((amenity) => (
                <li key={amenity.slug}>
                  <AmenityIcon
                    slug={amenity.slug}
                    icon={amenity.icon}
                    className={s.amenityIcon}
                  />
                  <span>{amenity.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- booking: a placeholder that does not lie about itself ---- */}
          <aside className={s.booking} id="reserve" aria-labelledby="reserve-heading">
            <h3 className={s.bookHead} id="reserve-heading">
              Reserve
            </h3>

            <p className={s.bookPrice}>
              {formatPriceEur(stay.basePriceCents)}
              <i>&nbsp;/ night</i>
            </p>

            <dl className={s.bookFacts}>
              <div>
                <dt>Minimum stay</dt>
                <dd>{capitalise(nights(stay.minNights))}</dd>
              </div>
              <div>
                <dt>Sleeps</dt>
                <dd>
                  {capitalise(numberWord(stay.capacity))} · {bedrooms(stay.bedrooms)}
                </dd>
              </div>
              <div>
                <dt>Dates</dt>
                <dd className={s.bookPending}>Not open yet</dd>
              </div>
            </dl>

            <button
              className={s.reserveButton}
              type="button"
              disabled
              aria-describedby="reserve-note"
            >
              Reserve — not open
            </button>

            <p className={s.bookNote} id="reserve-note">
              There is no calendar here because there is nothing behind one yet.
              Availability and the real price for a set of dates are calculated by the
              booking service, which is not built.
            </p>

            <p className={s.bookFine}>
              Base rate, before season. And plainly: Stillnest is a concept project — this
              house is fictional, nothing on this page can be booked, and no money moves
              anywhere.
            </p>
          </aside>
        </div>
      </section>

      {/* =========================== WHERE IT IS ========================== */}
      <section className={s.section} id="where">
        <SectionHead
          variant="split"
          kicker="Where it is"
          title="Findable. Not quickly."
          aside="Enough to know what you are agreeing to, and not enough to put anyone on the doorstep."
        />

        <div className={s.whereGrid}>
          {/* The two facts under the address are the two that decide whether
              you can go: what is nearest, and what you are standing on. Both
              come from the shared copy generators, so neither can describe
              the house more kindly than the survey did. */}
          <dl className={s.facts}>
            <div>
              <dt>Region</dt>
              <dd>
                <span>{where}</span>
                <span className={s.factNote}>
                  The region is real and worth reading about. The house in it is not.
                </span>
              </dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>
                <span className={s.factValue}>{coords}</span>
                <span className={s.factNote}>
                  Degrees and minutes only. Seconds would put the door on a map to within
                  thirty metres, which is the opposite of what this is for.
                </span>
              </dd>
            </div>
            <div>
              <dt>Nearest dwelling</dt>
              <dd>
                <span className={s.factValue}>{formatKm(stay.solitudeKm)} km</span>
                <span className={s.factNote}>{SOLITUDE_NOTE}</span>
              </dd>
            </div>
            <div>
              <dt>The ground</dt>
              <dd>
                <span className={s.factValue}>{biomeGround(stay.biome)}</span>
                <span className={s.factNote}>
                  What is underfoot and what is standing in it, for the whole of the last
                  stretch.
                </span>
              </dd>
            </div>
          </dl>

          <div className={s.closed}>
            <p className={s.closedHead}>Closed</p>
            {stay.blocks.length > 0 ? (
              <ul className={s.closedList}>
                {stay.blocks.map((block) => (
                  <li key={`${block.startsOn}-${block.endsOn}`}>
                    <span className={s.closedWhen}>
                      {formatClosedRange(block.startsOn, block.endsOn)}
                    </span>
                    <span className={s.closedWhy}>
                      {BLOCK_REASON[block.reason] ?? "Closed."}
                      {block.note ? ` ${block.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.closedNone}>
                Nothing on file. When a house shuts — weather, work, or the owner — the
                dates and the reason are printed here rather than quietly removed from a
                calendar.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================== OTHER HOUSES ========================= */}
      {others.length > 0 ? (
        <section className={`${s.section} ${s.more}`} id="more">
          <SectionHead
            variant="split"
            kicker="Elsewhere"
            title="Other houses."
            aside="The three furthest from anyone at all. Ranked by distance, like everything else on this site."
          />

          <ul className={s.cards}>
            {others.map((other) => (
              <StayCard key={other.slug} stay={other} />
            ))}
          </ul>
        </section>
      ) : null}

      <SiteFooter />
    </main>
  );
}
