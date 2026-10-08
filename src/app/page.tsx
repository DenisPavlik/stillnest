import type { Metadata } from "next";
import type { ReactNode } from "react";

import { FilmGrain } from "@/components/film-grain";
import { Reveal } from "@/components/motion/reveal";
import { hashSeed } from "@/components/scene/geometry";
import { SectionHead } from "@/components/section-head";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ReachLine, SolitudeIndex } from "@/components/solitude";
import { StayCard } from "@/components/stay-card";
import { Still } from "@/components/still";
import { pageMetadata } from "@/lib/site";
import { countStays, featuredStays, getStayBySlug } from "@/lib/db/queries";
import { capitalise, formatCoords, numberWord } from "@/lib/format";

import { HeroDeparture, Threshold } from "./home-motion";
import s from "./home.module.css";

/* ==================================================================== *
 *  HOME — spruce at dusk, one lit window, and the distance to the
 *  nearest other one.
 *
 *  This is the Forest Nocturne direction chosen in Phase 0. Palette and
 *  type tokens live in globals.css; the fonts are declared in layout.tsx;
 *  every reusable piece of it now lives in src/components. This file is
 *  the composition and nothing else.
 *
 *  The hero is a MEDIA SLOT: the generated scene sits inside `.media`
 *  under the same rules an <img> or <video> would obey, so swapping in
 *  real footage changes nothing about the layout. That is the whole point
 *  of the structure — do not "simplify" it away.
 * ==================================================================== */

/**
 * The hero is a portrait of one place rather than a listing: the generated
 * scene IS Hollowmoss 04 — old spruce, black standing water, fog off the
 * lake at dusk. The figures are that survey's own, and the moment (time,
 * temperature, weather) belongs to the picture, not to the database. When
 * real footage lands in Phase 9 this block describes the footage.
 */
const HERO = {
  house: "Hollowmoss 04",
  solitudeKm: 34,
  place: "Jämtland, Sweden",
  moment: "63°41′N 13°06′E · 21:40 · 3°C · fog",
} as const;


export const metadata: Metadata = pageMetadata({
  title: "Stillnest — Nowhere. On purpose.",
  description:
    "Twelve off-grid houses, measured by how far they are from everyone else — distance, silence, signal and dark sky instead of bedrooms. A concept project.",
  path: "/",
});

export default async function HomePage(): Promise<ReactNode> {
  const [featured, total] = await Promise.all([featuredStays(3), countStays()]);

  /* The panel reports on the most remote house we have — featuredStays is
     already ordered by distance, so it is the first one. The full record is
     fetched for its coordinates; the card rows do not carry them. */
  const survey = featured[0] ? await getStayBySlug(featured[0].slug) : null;

  return (
    <main className={s.page}>
      <FilmGrain />

      {/* ============================== HERO ==============================
          <HeroDeparture> is a plain <header> with the noise → silence
          choreography attached — the settle on arrival, and the departure on
          the first scroll. It is the only client component on the page; the
          markup inside it is still server-rendered. The `data-hero-*` hooks
          are what it addresses, and they are the whole contract: see
          home-motion.tsx. */}
      <HeroDeparture className={s.hero} id="top">
        {/* MEDIA SLOT — Phase 9. The generated <ForestScene> that stood here
            has been replaced by the real photograph, and the parallax noticed
            on its own: with no [data-depth] planes to find it drifts the slot
            as one piece, exactly as it was built to.

            TWO FILES, ONE BUILDING. A landscape photograph in a phone-shaped
            hero is not a crop problem, it is a geometry problem — the slot is
            about 0.50 wide-to-tall and the picture is 1.50, so `cover` throws
            away two thirds of the width and cuts the house in half. Measured:
            the house spans 154% of the frame at 375px. The portrait file is
            the same photograph extended upward into forest and downward into
            water, so the house lands at 60% and fits whole.

            The switch is on aspect ratio, not on width: what breaks the shot
            is the slot being taller than it is wide, and a portrait tablet
            does that at 768px just as a phone does at 375px. */}
        <div className={s.media} data-hero-slot>
          <Still
            className={s.mediaPicture}
            base="stays/hollowmoss-04/exterior"
            portraitBase="stays/hollowmoss-04/exterior-portrait"
            alt={`${HERO.house} at dusk — a low timber house lit from within, on the far bank of black standing water in old spruce forest.`}
            priority
          />
        </div>
        <div className={s.scrim} aria-hidden="true" />

        <div className={s.frame}>
          <SiteNav />

          <div className={s.heroSpace} />

          <div className={s.heroFoot} data-hero-copy>
            <h1 className={s.tagline} data-hero-tagline>
              <span>Nowhere.</span>
              <span>On purpose.</span>
            </h1>

            <p className={s.heroLede} data-hero-lede>
              {capitalise(numberWord(total))} houses. None of them within sight of another.
            </p>

            <div className={s.reachBlock} data-hero-reach>
              {/* "this house" rather than the house's name: on a first visit
                  `HOLLOWMOSS 04` is an unexplained code, and an unexplained
                  code at one end of a measurement makes the whole measurement
                  unreadable. The name is not what the hero is selling — the
                  distance is. */}
              <ReachLine
                km={HERO.solitudeKm}
                left="this house"
                right="nearest lit window"
                /* One line, and one line only. The hero is a fixed height and
                   the coordinates below it have to survive; a second sentence
                   here also said what the section under the fold already says
                   about surveying on foot. */
                note="The nearest light you could walk to."
              />
              <p className={s.heroWhere} data-hero-where>
                <span>{HERO.place}</span>
                <span>{HERO.moment}</span>
              </p>
            </div>
          </div>
        </div>
      </HeroDeparture>

      {/* ========================= SOLITUDE INDEX ========================= */}
      <section className={s.index} id="index">
        {/* the seam: one hairline where the noise stops */}
        <Threshold />

        <Reveal>
          <SectionHead
            kicker="The Solitude Index"
            title={
              <>
                Bedrooms have never once told anyone
                <em> how alone they were about to be.</em>
              </>
            }
            lede="Every house is surveyed on foot, after dark, before it is allowed onto the map. Five readings come back. We publish all five and nothing else — you search by distance, level and darkness, the way you would actually choose."
          />
        </Reveal>

        {survey ? (
          /* The head, the five instruments and the composite come online one
             band at a time — a survey reporting in, not a spec sheet. */
          <Reveal className={s.indexPanel} select="[data-panel-row]" stagger={0.09} distance={12}>
            <SolitudeIndex
              name={survey.name}
              where={`${survey.region}, ${survey.country} · ${formatCoords(survey.lat, survey.lng)}`}
              readings={survey}
              seed={hashSeed(survey.slug) % 4096}
            />
          </Reveal>
        ) : null}
      </section>

      {/* ============================= HOUSES ============================= */}
      <section className={s.houses} id="houses">
        <Reveal>
          <SectionHead
            variant="split"
            kicker={`${numberWord(featured.length)} of ${numberWord(total)}`}
            title="Unoccupied tonight."
            aside={`Availability is thin on purpose. We keep ${numberWord(total)} houses, and we have no intention of ever keeping ${numberWord(total + 1)}.`}
          />
        </Reveal>

        <Reveal as="ul" className={s.cards} stagger={0.12}>
          {featured.map((stay) => (
            <StayCard key={stay.slug} stay={stay} />
          ))}
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  );
}
