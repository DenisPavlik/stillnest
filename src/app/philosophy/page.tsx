import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { FilmGrain } from "@/components/film-grain";
import { Reveal } from "@/components/motion/reveal";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { countStays } from "@/lib/db/queries";
import { numberWord } from "@/lib/format";

import s from "./philosophy.module.css";

/* ==================================================================== *
 *  PHILOSOPHY — why the site sells distance instead of houses.
 *
 *  The one page here that is only words, and the only one that does not
 *  use <SectionHead>. That is the point of it rather than an oversight:
 *  a kicker rule and a heading at one size, four times down a page, is a
 *  rhythm you stop hearing after the second beat. This page is built on
 *  scale instead — an opening at hero size, a line that breaks the page
 *  measure entirely, an instrument table, and an ending deliberately
 *  quieter than everything above it.
 *
 *  Loud, quiet, loud, quiet. If a fifth section ever wants in here, it
 *  has to earn a place in that sequence or it belongs on another page.
 * ==================================================================== */

export const metadata: Metadata = {
  title: "Philosophy — Stillnest",
  description:
    "Why Stillnest measures distance, silence and darkness instead of bedrooms — how each reading is taken, and what the site refuses to do.",
};

/**
 * How each reading is taken. The wording is deliberately the same claim the
 * instruments make in `readings.ts` — if a definition here ever drifts from
 * the note printed under a live reading, the site is arguing with itself.
 */
const METHOD: readonly { reading: string; unit: string; how: string }[] = [
  {
    reading: "Solitude",
    unit: "km",
    how: "Kilometres to the nearest permanent dwelling, measured in the direction it is closest — not the average, and not the direction that flatters us.",
  },
  {
    reading: "Silence",
    unit: "dB",
    how: "Ambient level, sixty seconds, instruments at 1.5 metres. One number, taken once, kept whatever it says. Quiet is not the same as silent and we do not pretend otherwise.",
  },
  {
    reading: "Signal",
    unit: "none · weak · full",
    how: "Recorded as found, standing outside, at the spot where it is strongest. None is the best possible result on this instrument, and it is priced as one.",
  },
  {
    reading: "Dark sky",
    unit: "Bortle 1–9",
    how: "Class 1 is a sky in which the Milky Way throws a shadow. Class 9 is a city. Nothing on our map is brighter than class 4.",
  },
  {
    reading: "Biome",
    unit: "ground",
    how: "What is underfoot, and what is standing in it. The least numerical of the five, and the one that decides what the last hour of the drive is like.",
  },
];

/** The things the site will not do, and the reason each one is refused. */
const REFUSALS: readonly { title: string; because: string }[] = [
  {
    title: "No reviews.",
    because:
      "Nobody's opinion of the quiet is more reliable than the measurement of it. A five-star average would tell you how a stranger's week went, which is not the same subject.",
  },
  {
    title: "No counter saying two people are looking at this.",
    because:
      "Every one of those is engineered to make you hurry. It would be a strange thing to put on a site whose entire argument is that you should slow down.",
  },
  {
    title: "Bedrooms are not the first question.",
    because:
      "Beds answer how many. They have never once answered how alone, and how alone is the thing you actually came here to decide.",
  },
  {
    title: "No thirteenth house.",
    because:
      "Twelve is not a number we are working up from. Each house added is a house nearer to another one, and the distance between them is the inventory.",
  },
];

export default async function PhilosophyPage(): Promise<ReactNode> {
  const total = await countStays();

  return (
    <main className={s.page}>
      <FilmGrain uid="ph-grain" />
      <SiteNav variant="bar" />

      {/* ============================= OPENING =============================
          Hero scale on a page with no hero. The whole argument is one
          sentence, so it gets the room a sentence that carries a site
          deserves — and everything below it is quieter by comparison,
          which is what makes the rest readable rather than shouted. */}
      <Reveal as="header" className={s.opening} distance={16}>
        <p className={s.eyebrow}>Philosophy</p>
        <h1 className={s.statement}>
          <span>You are not renting a house.</span>
          <em>You are renting the distance around it.</em>
        </h1>
        <p className={s.openingLede}>
          Everything on this site follows from that one sentence — what gets measured,
          what gets refused, and why there are {numberWord(total)} houses and will never
          be a thirteenth.
        </p>
      </Reveal>

      {/* ============================== THE CASE ========================== */}
      <section className={s.section}>
        <Reveal className={s.sectionHead} stagger={0.08} distance={14}>
          <p className={s.ordinal} aria-hidden="true">
            01
          </p>
          <h2 className={s.sectionTitle}>Quiet is sold everywhere and measured nowhere.</h2>
        </Reveal>

        <Reveal className={s.prose} stagger={0.08} distance={14}>
          <p>
            Every listing site on earth will tell you a house is peaceful. Not one of them
            will tell you how far you would have to walk to prove it.
          </p>
          <p>
            Peaceful is a photograph taken on the right morning. It is the word you reach
            for when there is nothing to count. So we count instead — how far, how quiet,
            how dark, how reachable — and we publish all of it, at every house, whether or
            not the answer is good.
          </p>
        </Reveal>
      </section>

      {/* The loudest thing on the page, and the only element on the site that
          ignores the page measure entirely. It is the conclusion of the section
          above it, so it is set as a line to be read across a room rather than
          as another paragraph. */}
      <Reveal className={s.bleed} distance={18}>
        <p className={s.bleedLine}>
          A number can disappoint you before you book.
          <em>An adjective can only disappoint you after.</em>
        </p>
      </Reveal>

      {/* ============================= THE METHOD ========================= */}
      <section className={s.section}>
        <Reveal className={s.sectionHead} stagger={0.08} distance={14}>
          <p className={s.ordinal} aria-hidden="true">
            02
          </p>
          <h2 className={s.sectionTitle}>Surveyed on foot, after dark.</h2>
          <p className={s.sectionLede}>
            None of this is inferred from a map. Somebody stood in each of these places at
            night, with instruments, and wrote down what came back. Five readings, the same
            five everywhere, in the same order.
          </p>
        </Reveal>

        <Reveal as="dl" className={s.method} select="[data-method-row]" stagger={0.07} distance={12}>
          {METHOD.map(({ reading, unit, how }, i) => (
            <div className={s.methodRow} key={reading} data-method-row>
              <dt>
                <span className={s.methodIndex} aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={s.methodName}>{reading}</span>
                <span className={s.methodUnit}>{unit}</span>
              </dt>
              <dd>{how}</dd>
            </div>
          ))}
        </Reveal>

        <Reveal className={s.footnote} distance={12}>
          <p>
            The composite index on each house weights distance at forty per cent and the
            other three readings at twenty each. Distance carries the most because it is
            the only one of the five that cannot be improved by waiting for better
            weather.
          </p>
        </Reveal>
      </section>

      {/* ============================ THE REFUSALS ======================== */}
      <section className={s.section}>
        <Reveal className={s.sectionHead} stagger={0.08} distance={14}>
          <p className={s.ordinal} aria-hidden="true">
            03
          </p>
          <h2 className={s.sectionTitle}>The absences are the product.</h2>
          <p className={s.sectionLede}>
            Four decisions that cost us something, listed here because a site is defined at
            least as much by what it leaves out.
          </p>
        </Reveal>

        <Reveal as="ul" className={s.refusals} stagger={0.1} distance={14}>
          {REFUSALS.map(({ title, because }, i) => (
            <li key={title}>
              <span className={s.refusalIndex} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{title}</h3>
              <p>{because}</p>
            </li>
          ))}
        </Reveal>
      </section>

      {/* ============================== HONESTY ===========================
          Quieter than everything above it on purpose. The page has spent
          four sections raising its voice about measurement; the admission
          that none of the houses exist would be unbearable at the same
          volume, and slightly ridiculous. */}
      <section className={s.section}>
        <Reveal className={s.admission} stagger={0.09} distance={14}>
          <p className={s.eyebrow}>One more thing</p>
          <h2 className={s.admissionTitle}>None of this is real.</h2>
          <p>
            Stillnest is a concept project. The {numberWord(total)} houses are invented,
            the surveys never happened, and nothing on this site can actually be rented.
            The engineering underneath it is real — the availability, the pricing, the
            search — but the houses are not.
          </p>
          <p>
            Leaving that ambiguous would have been easy, and it would have worked. A site
            whose whole argument is honest measurement cannot also be quietly dishonest
            about itself.
          </p>
          {/* next/link here for the same reason the empty state uses it: this
              is the way onward from a page that has just told you the houses
              are invented, and it should feel immediate rather than reload the
              document. The nav's own links stay plain anchors. */}
          <p className={s.onward}>
            <Link href="/stays">See the {numberWord(total)} houses anyway</Link>
          </p>
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  );
}
