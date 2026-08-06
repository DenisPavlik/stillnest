import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { FilmGrain } from "@/components/film-grain";
import { SectionHead } from "@/components/section-head";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { BIOME_LABEL } from "@/components/solitude";
import { StayCard } from "@/components/stay-card";
import { biomeCounts, countStays, listStays, solitudeBounds } from "@/lib/db/queries";
import { capitalise, formatKm, numberWord } from "@/lib/format";

import { StaysConsole } from "./console";
import {
  STAYS_PATH,
  isFiltered,
  parseStayQuery,
  stayHref,
  toQuery,
  without,
  type RelaxKey,
  type StayQuery,
} from "./search-params";
import s from "./stays.module.css";

/* ==================================================================== *
 *  THE CATALOG.
 *
 *  A Server Component that reads the URL, asks the database once, and
 *  renders. The console below it is the only client code on the page, and
 *  it navigates rather than fetching — so every filtered view is a real
 *  address that can be linked, refreshed and gone back from.
 *
 *  Nothing here decides a range: `solitudeBounds()` derives every slider
 *  end from the houses that actually exist, so the console can never offer
 *  a setting the catalog has no answer to.
 * ==================================================================== */

export const metadata: Metadata = {
  title: "Houses — Stillnest",
  description:
    "Twelve off-grid houses, searched by how far they are from everyone else rather than by bedrooms and price.",
};

export default async function StaysPage({
  searchParams,
}: PageProps<"/stays">): Promise<ReactNode> {
  const [raw, bounds, counts, total] = await Promise.all([
    searchParams,
    solitudeBounds(),
    biomeCounts(),
    countStays(),
  ]);

  const query = parseStayQuery(raw, bounds);
  const stays = await listStays(query);

  /* Only when the screen would otherwise be empty do we go back to the
     database to find out which single reading is doing it. Six counts at
     most, and only on the one path where an answer is worth the trip. */
  const diagnosis =
    stays.length === 0 ? await diagnose(query, bounds) : null;

  return (
    <main className={s.page}>
      <FilmGrain uid="st-grain" />
      <SiteNav variant="bar" />

      <header className={s.head}>
        <SectionHead
          as="h1"
          kicker="The catalog"
          title={
            <>
              {capitalise(numberWord(total))} houses.
              <em>Ranked by distance, never by view.</em>
            </>
          }
          lede="Set the console for how alone you want to be. Every figure it filters on was walked to and measured on the ground, after dark — none of it is inferred from a map."
        />
      </header>

      <div className={s.consoleWrap}>
        <StaysConsole
          bounds={bounds}
          query={query}
          signature={toQuery(query, bounds)}
          biomeCounts={counts}
          resultCount={stays.length}
          total={total}
          reading={describeQuery(query)}
        />
      </div>

      <section className={s.results} id="results">
        <h2 className={s.srOnly}>
          {stays.length === 0
            ? "No houses match the console"
            : `${stays.length} houses match the console`}
        </h2>

        {stays.length > 0 ? (
          <ul className={s.cards}>
            {stays.map((stay) => (
              <StayCard key={stay.slug} stay={stay} />
            ))}
          </ul>
        ) : (
          <div className={s.empty}>
            <p className={s.emptyKicker}>Nothing on the map</p>
            <p className={s.emptyTitle}>{diagnosis?.headline}</p>
            <p className={s.emptyBody}>{diagnosis?.body}</p>
            {/* The one place on this page that uses next/link: these two are
                the way out of a dead end, and they should feel as immediate
                as the console does rather than reloading the document. */}
            <div className={s.emptyActions}>
              {diagnosis?.relaxHref ? (
                <Link className={s.relax} href={diagnosis.relaxHref} scroll={false}>
                  {diagnosis.relaxLabel}
                </Link>
              ) : null}
              {isFiltered(query) ? (
                <Link className={s.clearAll} href={STAYS_PATH} scroll={false}>
                  Clear everything
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

/* ==================================================================== *
 *  The filters, in English.
 * ==================================================================== */

interface ActiveFilter {
  key: RelaxKey;
  /** How the copy refers to it: "Drop the distance". */
  short: string;
  /** How the copy states it: "houses at least 40 km from anyone". */
  phrase: string;
}

function activeFilters(query: StayQuery): ActiveFilter[] {
  const active: ActiveFilter[] = [];

  if (query.minSolitudeKm !== undefined) {
    active.push({
      key: "minSolitudeKm",
      short: "the distance",
      phrase: `at least ${formatKm(query.minSolitudeKm)} km from anyone`,
    });
  }
  if (query.maxNoiseDb !== undefined) {
    active.push({
      key: "maxNoiseDb",
      short: "the quiet",
      phrase: `quieter than ${query.maxNoiseDb} dB`,
    });
  }
  if (query.maxBortle !== undefined) {
    active.push({
      key: "maxBortle",
      short: "the dark sky",
      phrase: `under a class ${query.maxBortle} sky or darker`,
    });
  }
  if (query.connectivity !== undefined) {
    active.push({
      key: "connectivity",
      short: "the signal",
      phrase:
        query.connectivity === "none"
          ? "with no signal at all"
          : `with ${query.connectivity} signal`,
    });
  }
  if (query.guests !== undefined) {
    active.push({
      key: "guests",
      short: "the party size",
      phrase: `sleeping ${query.guests} or more`,
    });
  }
  if (query.biome !== undefined) {
    active.push({
      key: "biome",
      short: "the ground",
      phrase: `on ${BIOME_LABEL[query.biome].toLowerCase()} ground`,
    });
  }

  return active;
}

const ORDER_NOTE: Record<StayQuery["sort"], string> = {
  solitude: "Furthest from anyone first.",
  silence: "Quietest first.",
  "dark-sky": "Darkest sky first.",
  price: "Cheapest first.",
};

/** "a, b and c" — the site writes lists the way a person would say them. */
function series(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/**
 * The console state, said out loud. It doubles as the honest summary of
 * what the page is currently showing — if the sentence and the grid ever
 * disagree, the grid is wrong.
 */
function describeQuery(query: StayQuery): string {
  const rest = activeFilters(query).filter((filter) => filter.key !== "biome");
  const noun = query.biome ? `${BIOME_LABEL[query.biome]} houses` : "Houses";
  const order = ORDER_NOTE[query.sort];

  if (rest.length === 0) {
    return query.biome
      ? `${noun}, all of them. ${order}`
      : `Every house we keep. ${order}`;
  }

  return `${noun} ${series(rest.map((filter) => filter.phrase))}. ${order}`;
}

/* ==================================================================== *
 *  The empty state.
 *
 *  An empty screen is an invitation to act, so it has to name the reading
 *  that is doing the excluding rather than shrug. Each active filter is
 *  removed on its own and counted, and the one we offer to drop is the one
 *  that brings back the FEWEST houses while still bringing back some — the
 *  smallest concession that gets an answer, rather than the one that hands
 *  back the most catalog. Someone who asked to be 80 km from anyone did not
 *  mean "show me everything instead".
 *
 *  If no single filter restores anything, the combination is at fault and
 *  the page says exactly that, instead of blaming a setting that is
 *  innocent on its own.
 * ==================================================================== */

interface Diagnosis {
  headline: string;
  body: string;
  relaxHref?: string;
  relaxLabel?: string;
}

async function diagnose(
  query: StayQuery,
  bounds: Awaited<ReturnType<typeof solitudeBounds>>,
): Promise<Diagnosis> {
  const active = activeFilters(query);

  if (active.length === 0) {
    return {
      headline: "The map is empty.",
      body: "No house is live right now. That is a fault at our end, not a filter at yours.",
    };
  }

  const counted = await Promise.all(
    active.map(async (filter) => ({
      filter,
      n: await countStays(without(query, filter.key)),
    })),
  );

  const restoring = counted.filter((candidate) => candidate.n > 0);
  const best = restoring.reduce(
    (a, b) => (b.n < a.n ? b : a),
    restoring[0] ?? counted[0],
  );

  if (best.n === 0) {
    return {
      headline: "It is the combination, not any one reading.",
      body: "Drop any single setting and there is still nothing standing. These houses are rare on purpose — loosen two of them, or start again.",
    };
  }

  return {
    headline: `Nothing gets past ${best.filter.short}.`,
    body: `You asked for houses ${best.filter.phrase}. Relax that one reading and ${numberWord(best.n)} ${best.n === 1 ? "house comes" : "houses come"} back — everything else you set stays where it is.`,
    relaxHref: stayHref(without(query, best.filter.key), {}, bounds),
    relaxLabel: `Drop ${best.filter.short}`,
  };
}
