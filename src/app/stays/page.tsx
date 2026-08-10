import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { FilmGrain } from "@/components/film-grain";
import { Reveal } from "@/components/motion/reveal";
import { SectionHead } from "@/components/section-head";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { BIOME_LABEL } from "@/components/solitude";
import { StayCard } from "@/components/stay-card";
import { searchSemantic } from "@/lib/api/client";
import {
  biomeCounts,
  countStays,
  listStays,
  solitudeBounds,
  staysBySlugs,
} from "@/lib/db/queries";
import { capitalise, formatKm, numberWord } from "@/lib/format";

import { CardGrid } from "./card-grid";
import { StaysConsole } from "./console";
import {
  STAYS_PATH,
  isFiltered,
  parseStayQuery,
  stayHref,
  toQuery,
  without,
  withoutQuery,
  type RelaxKey,
  type SearchState,
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
 *
 *  ONE PARAM CHANGES THE SHAPE OF ALL THIS: `q`, the sentence. With it,
 *  the order of the grid comes from a cosine distance computed in the
 *  Python service rather than from an ORDER BY, and the page has to say
 *  so — a grid that silently re-sorts is a grid nobody trusts.
 *
 *  It also has to survive that service being gone. Python is a separate
 *  process: not running locally, redeploying in production, out of OpenAI
 *  quota. When it does not answer, the sentence is not answered either,
 *  and the page falls back to the ordinary filtered catalog and says
 *  plainly that search is down. An empty grid would be a lie — it would
 *  read as "nothing matched", which is a statement about the houses, when
 *  the truth is a statement about us.
 * ==================================================================== */

export const metadata: Metadata = {
  title: "Houses — Stillnest",
  description:
    "Twelve off-grid houses, searched by how far they are from everyone else rather than by bedrooms and price.",
};

/**
 * How many ranked candidates to ask the search service for.
 *
 * Generous on purpose: the service only enforces the filters it has a field
 * for, and the rest of the console is applied afterwards in SQL, so asking for
 * a deep list is what stops a narrow reading from emptying a page that has
 * perfectly good answers a few ranks down.
 */
const SEARCH_CANDIDATES = 24;

/**
 * How many of those survivors are shown.
 *
 * Cosine distance always returns *something* — there is no "no match" in it —
 * so an uncapped semantic search hands back the entire catalog in a new order
 * and quietly implies the twelfth house has something to do with what was
 * asked. It does not. This is a shortlist, and the copy says it is.
 */
const SEARCH_SHOWN = 6;

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

  /* The sentence, if there is one. `search` is null when nothing was asked,
     "ok" when the service ranked it, and "offline" when it did not answer —
     three states, because two of them look identical in a grid. */
  const ranked = query.q ? await rank(query.q, query) : null;
  const search: SearchState | null = ranked ? ranked.state : null;

  /* A ranked read is still held to the console: `staysBySlugs` applies the
     same WHERE clause `listStays` does, so a house cannot arrive on this page
     by being poetic about a reading the visitor ruled out. */
  const matched =
    ranked?.state === "ok"
      ? await staysBySlugs(ranked.slugs, query)
      : await listStays(query);

  const stays = ranked?.state === "ok" ? matched.slice(0, SEARCH_SHOWN) : matched;
  const shortlisted = matched.length > stays.length;

  /* Only when the screen would otherwise be empty do we go back to the
     database to find out which single reading is doing it. Six counts at
     most, and only on the one path where an answer is worth the trip. */
  const diagnosis =
    stays.length === 0 ? await diagnose(query, bounds, search) : null;

  /* The canonical query string. The console uses it to tell its own pushes
     apart from someone else's navigation; the grid uses it to notice that the
     catalog was re-cut and re-measure its triggers. */
  const signature = toQuery(query, bounds);

  return (
    <main className={s.page}>
      <FilmGrain uid="st-grain" />
      <SiteNav variant="bar" />

      {/* The heading block and the console are both above the fold, so these two
          reveals are a load-in rather than a scroll reveal: the page settles in
          the order it is read, and the console arrives a beat after the sentence
          that explains what it is for. */}
      <Reveal as="header" className={s.head} distance={14}>
        <SectionHead
          as="h1"
          kicker="The catalog"
          title={
            <>
              {capitalise(numberWord(total))} houses.
              <em>Ranked by distance, never by view.</em>
            </>
          }
          lede="Say what you are after, or set the console for how alone you want to be. Every figure it filters on was walked to and measured on the ground, after dark — none of it is inferred from a map."
        />
      </Reveal>

      <Reveal as="div" className={s.consoleWrap} delay={0.12} distance={14}>
        <StaysConsole
          bounds={bounds}
          query={query}
          signature={signature}
          biomeCounts={counts}
          resultCount={stays.length}
          total={total}
          reading={describeQuery(query, search, shortlisted)}
          search={search}
        />
      </Reveal>

      <section className={s.results} id="results">
        <h2 className={s.srOnly}>{resultsHeading(stays.length, search)}</h2>

        {stays.length > 0 ? (
          <CardGrid className={s.cards} signature={signature}>
            {stays.map((stay) => (
              <StayCard key={stay.slug} stay={stay} />
            ))}
          </CardGrid>
        ) : (
          <Reveal as="div" className={s.empty} stagger={0.09} distance={14}>
            <p className={s.emptyKicker}>Nothing on the map</p>
            <p className={s.emptyTitle}>{diagnosis?.headline}</p>
            <p className={s.emptyBody}>{diagnosis?.body}</p>
            {/* The one place on this page that uses next/link: these are the
                way out of a dead end, and they should feel as immediate as the
                console does rather than reloading the document. */}
            <div className={s.emptyActions}>
              {diagnosis?.actions.map((action) => (
                <Link
                  key={action.href + action.label}
                  className={action.tone === "primary" ? s.relax : s.clearAll}
                  href={action.href}
                  scroll={false}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

/* ==================================================================== *
 *  Asking the search service.
 *
 *  Two things are deliberate here.
 *
 *  ONLY THE FILTERS THE SERVICE HAS A FIELD FOR ARE SENT. Its SearchFilters
 *  are biome, guests, connectivity and `max_solitude_km` — a CEILING on
 *  distance, which is the exact opposite of the console's floor. Mapping
 *  `minSolitudeKm` onto it would silently invert the one reading this whole
 *  product is built on, so it is not sent at all: the distance, the noise
 *  ceiling and the sky class are enforced in SQL when the slugs are read
 *  back. The contract stays where it is; nothing is bent to fit.
 *
 *  AND EVERY FAILURE IS THE SAME FAILURE. Connection refused, a 503 because
 *  the embedding provider is out of quota, a body that does not parse — from
 *  this page's point of view they are one state: the sentence was not read.
 * ==================================================================== */

type Ranked = { state: "ok"; slugs: string[] } | { state: "offline" };

async function rank(sentence: string, query: StayQuery): Promise<Ranked> {
  try {
    const answer = await searchSemantic({
      query: sentence,
      filters: {
        biome: query.biome ?? null,
        guests: query.guests ?? null,
        connectivity: query.connectivity ?? null,
      },
      limit: SEARCH_CANDIDATES,
    });

    return { state: "ok", slugs: answer.hits.map((hit) => hit.slug) };
  } catch (error) {
    console.error("[stays] semantic search unavailable:", error);
    return { state: "offline" };
  }
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
 *
 * With `q` in play it carries one more job, and it is the important one: the
 * ordering rule has silently changed under the visitor's feet, and a grid that
 * re-sorts itself without saying why is a grid that looks broken. So it says
 * what happened — matched by meaning, not ranked by distance — and, when the
 * shortlist actually cut something, that it is a shortlist.
 */
function describeQuery(
  query: StayQuery,
  search: SearchState | null,
  shortlisted: boolean,
): string {
  const filters = activeFilters(query);
  const rest = filters.filter((filter) => filter.key !== "biome");
  const noun = query.biome ? `${BIOME_LABEL[query.biome]} houses` : "Houses";
  const order = ORDER_NOTE[query.sort];

  const plain =
    rest.length === 0
      ? query.biome
        ? `${noun}, all of them. ${order}`
        : `Every house we keep. ${order}`
      : `${noun} ${series(rest.map((filter) => filter.phrase))}. ${order}`;

  if (query.q === undefined) return plain;

  if (search === "offline") {
    return `Search is not answering, so “${query.q}” has not been read — this is the ordinary catalog. ${plain}`;
  }

  const among =
    filters.length === 0
      ? ""
      : rest.length === 0
        ? `, among ${noun.toLowerCase()}`
        : `, among ${noun.toLowerCase()} ${series(rest.map((filter) => filter.phrase))}`;

  const cut = shortlisted
    ? ` The nearest ${numberWord(SEARCH_SHOWN)}, not the whole catalog.`
    : "";

  return `Read against “${query.q}”${among}. Closest in meaning first, not furthest from anyone.${cut}`;
}

/** The screen-reader heading over the grid — the same claim, out loud. */
function resultsHeading(count: number, search: SearchState | null): string {
  if (count === 0) return "No houses match";
  if (search === "ok") {
    return `${count} houses, closest in meaning to what you asked for first`;
  }
  return `${count} houses match the console`;
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
 *
 *  A SENTENCE ADDS A THIRD SUSPECT, and it must not be blamed by default.
 *  There are three genuinely different ways a search can end up empty and
 *  they deserve three different answers: the readings exclude everything on
 *  their own (the sentence is innocent — diagnose them as usual, keeping the
 *  sentence in every href), the readings return houses but not the ones the
 *  sentence found (nobody is wrong; the two simply disagree, and the way out
 *  is to drop one of them), or nothing has been embedded at all, which is our
 *  fault and says so.
 * ==================================================================== */

interface DiagAction {
  href: string;
  label: string;
  /** "primary" is the way out we recommend; "quiet" is the way back. */
  tone: "primary" | "quiet";
}

interface Diagnosis {
  headline: string;
  body: string;
  actions: DiagAction[];
}

async function diagnose(
  query: StayQuery,
  bounds: Awaited<ReturnType<typeof solitudeBounds>>,
  search: SearchState | null,
): Promise<Diagnosis> {
  const asked = query.q;
  const active = activeFilters(query);

  const dropSentence: DiagAction = {
    href: stayHref(withoutQuery(query), {}, bounds),
    label: "Drop the sentence",
    tone: "quiet",
  };

  /* ---- a sentence that WAS read, and came back to a page with nothing ---- */
  if (asked !== undefined && search === "ok") {
    if (!isFiltered(query)) {
      /* No reading is narrowing anything, so the search had the whole catalog
         to compare against and still found nothing to rank. That is not a
         question anyone can ask better — it is us. */
      return {
        headline: "Nothing here has been read yet.",
        body: "The sentence reached the search and the search had nothing to compare it against. That is a fault at our end, not a sentence at yours.",
        actions: [{ ...dropSentence, tone: "primary", label: "Back to the catalog" }],
      };
    }

    /* Reached when the search's answer and the console's answer are both
       non-empty and share nothing: a catalog grown past SEARCH_CANDIDATES, or —
       today's live case — a house that has been added but not yet embedded,
       which the console counts and the ranking cannot see. */
    const byConsole = await countStays(query);
    if (byConsole > 0) {
      return {
        headline: "The sentence and the console disagree.",
        body: `Nothing that reads like “${asked}” gets past the readings you set — and the readings are not empty either: ${numberWord(byConsole)} ${byConsole === 1 ? "house matches" : "houses match"} them, ${byConsole === 1 ? "it is" : "they are"} just not the ${byConsole === 1 ? "one" : "ones"} the sentence found. Drop one of the two.`,
        actions: [
          {
            href: stayHref({ q: asked, sort: query.sort }, {}, bounds),
            label: "Search everywhere",
            tone: "primary",
          },
          dropSentence,
        ],
      };
    }
    /* byConsole === 0: the console excludes everything on its own. The
       sentence had nothing to do with it — fall through and diagnose the
       readings, which is the honest answer. */
  }

  const ways = (best?: DiagAction): DiagAction[] => {
    const actions: DiagAction[] = best ? [best] : [];
    if (asked !== undefined) actions.push(dropSentence);
    if (isFiltered(query)) {
      actions.push({ href: STAYS_PATH, label: "Clear everything", tone: "quiet" });
    }
    return actions;
  };

  if (active.length === 0) {
    return {
      headline: "The map is empty.",
      body: "No house is live right now. That is a fault at our end, not a filter at yours.",
      actions: ways(),
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
      actions: ways(),
    };
  }

  return {
    headline: `Nothing gets past ${best.filter.short}.`,
    body: `You asked for houses ${best.filter.phrase}. Relax that one reading and ${numberWord(best.n)} ${best.n === 1 ? "house comes" : "houses come"} back — everything else you set stays where it is.`,
    actions: ways({
      /* The sentence rides along: relaxing a reading is not abandoning the
         question, and `without` keeps `q` exactly for this. */
      href: stayHref(without(query, best.filter.key), {}, bounds),
      label: `Drop ${best.filter.short}`,
      tone: "primary",
    }),
  };
}
