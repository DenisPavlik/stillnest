import type { Biome, Connectivity, StaySort } from "@/lib/db/queries";
import { BIOME_LABEL } from "@/components/solitude/readings";

/* ==================================================================== *
 *  THE URL IS THE FILTER STATE.
 *
 *  Everything the console can be set to lives in the query string, so a
 *  filtered catalog is linkable, survives a refresh and answers to the
 *  back button. Nothing is held in React state that the URL does not
 *  already say.
 *
 *  This module is imported by BOTH sides — the server page parses with it,
 *  the client console builds hrefs with it — so it may not touch anything
 *  server-only. The type imports from the query layer are erased at
 *  compile time; the runtime lists below are derived from `Record<…>`
 *  maps, which the compiler checks for exhaustiveness, so they cannot
 *  quietly fall out of step with the schema.
 * ==================================================================== */

export const PARAM = {
  q: "q",
  biome: "biome",
  km: "km",
  db: "db",
  sky: "sky",
  signal: "signal",
  sleeps: "sleeps",
  sort: "sort",
} as const;

export const DEFAULT_SORT: StaySort = "solitude";

/** Labels, and — because the map is exhaustive — the option lists too. */
export const SIGNAL_LABEL: Record<Connectivity, string> = {
  none: "None",
  weak: "Weak",
  full: "Full",
};

export const SORT_LABEL: Record<StaySort, string> = {
  solitude: "Distance",
  silence: "Silence",
  "dark-sky": "Darkness",
  price: "Price",
};

export const SIGNAL_VALUES = Object.keys(SIGNAL_LABEL) as Connectivity[];
export const SORT_VALUES = Object.keys(SORT_LABEL) as StaySort[];
export const BIOME_VALUES = Object.keys(BIOME_LABEL) as Biome[];

/** The shape `solitudeBounds()` returns — the slider ranges, derived from data. */
export interface SolitudeBounds {
  minKm: number;
  maxKm: number;
  minDb: number;
  maxDb: number;
  minBortle: number;
  maxBortle: number;
  maxGuests: number;
}

/**
 * The longest sentence we will embed. Long enough for anything anybody would
 * actually type at a search box, short enough that a pasted essay cannot turn
 * the catalog into an embedding bill or an unshareable URL. Cut, not rejected —
 * the first line of a long paste is still a real question.
 */
export const MAX_QUERY_CHARS = 160;

/**
 * A parsed query. Structurally a `StayFilters`, except `sort` is always
 * resolved — the catalog is never unordered — and `q`, which no SQL filter
 * reads: it goes to the semantic search instead, and comes back as an order.
 */
export interface StayQuery {
  /** The sentence, normalised. Never present and empty — absent means absent. */
  q?: string;
  biome?: Biome;
  minSolitudeKm?: number;
  maxNoiseDb?: number;
  maxBortle?: number;
  connectivity?: Connectivity;
  guests?: number;
  sort: StaySort;
}

/**
 * Every filter that can be individually relaxed. `sort` is not a filter, and
 * neither is `q` — the sentence narrows nothing on its own, it only ranks, so
 * it is dropped as a whole rather than relaxed.
 */
export type RelaxKey = Exclude<keyof StayQuery, "sort" | "q">;

/** What came back from the search service, as far as the UI needs to know. */
export type SearchState = "ok" | "offline";

/* ------------------------------ parsing ------------------------------ */

type Raw = Record<string, string | string[] | undefined>;

/** A repeated param (`?km=10&km=90`) is not an error — the first one wins. */
function one(raw: Raw, key: string): string | undefined {
  const value = raw[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Strict: "40" parses, "40.5" / "4e1" / "forty" / "" do not. */
function integer(raw: Raw, key: string): number | undefined {
  const value = one(raw, key)?.trim();
  if (!value || !/^-?\d{1,6}$/.test(value)) return undefined;
  return Number(value);
}

/**
 * A sentence, normalised.
 *
 * Whitespace is collapsed so that "  snow   " and "snow" are the same address
 * and hit the same cache, and a query that is nothing but whitespace is not a
 * query at all — it is dropped here rather than sent off to be embedded, which
 * would cost a network round trip to be told there are no hits.
 */
function sentence(raw: Raw, key: string): string | undefined {
  const value = one(raw, key);
  if (typeof value !== "string") return undefined;

  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) return undefined;

  return collapsed.slice(0, MAX_QUERY_CHARS).trim();
}

function clamp(n: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, n));
}

function member<T extends string>(
  raw: Raw,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = one(raw, key);
  return allowed.find((candidate) => candidate === value);
}

/**
 * Hand-edited URLs are expected, not exceptional.
 *
 * Anything unparseable falls back to the default (no filter). Anything
 * parseable but out of range is CLAMPED into the range the data actually
 * covers, rather than dropped: `?km=9000` means "as far out as you have",
 * and answering it with the whole catalog would be a lie about what was
 * asked. A filter that lands on its own no-op edge — the minimum distance,
 * the loudest reading we keep — is dropped, so it never appears in a
 * canonical URL and never shows as an active filter.
 */
export function parseStayQuery(raw: Raw, bounds: SolitudeBounds): StayQuery {
  const query: StayQuery = { sort: member(raw, PARAM.sort, SORT_VALUES) ?? DEFAULT_SORT };

  const q = sentence(raw, PARAM.q);
  if (q) query.q = q;

  const biome = member(raw, PARAM.biome, BIOME_VALUES);
  if (biome) query.biome = biome;

  const connectivity = member(raw, PARAM.signal, SIGNAL_VALUES);
  if (connectivity) query.connectivity = connectivity;

  const km = integer(raw, PARAM.km);
  if (km !== undefined) {
    const value = clamp(km, bounds.minKm, bounds.maxKm);
    if (value > bounds.minKm) query.minSolitudeKm = value;
  }

  const db = integer(raw, PARAM.db);
  if (db !== undefined) {
    const value = clamp(db, bounds.minDb, bounds.maxDb);
    if (value < bounds.maxDb) query.maxNoiseDb = value;
  }

  const sky = integer(raw, PARAM.sky);
  if (sky !== undefined) {
    const value = clamp(sky, bounds.minBortle, bounds.maxBortle);
    if (value < bounds.maxBortle) query.maxBortle = value;
  }

  const sleeps = integer(raw, PARAM.sleeps);
  if (sleeps !== undefined) {
    const value = clamp(sleeps, 1, bounds.maxGuests);
    if (value > 1) query.guests = value;
  }

  return query;
}

/* ---------------------------- serialising ---------------------------- */

/**
 * The canonical query string for a state: fixed key order, defaults and
 * no-op edges omitted. Two identical filter states always produce the same
 * string, which is what lets the console tell its own navigation apart
 * from the back button.
 */
export function toQuery(query: StayQuery, bounds: SolitudeBounds): string {
  const params = new URLSearchParams();

  // The sentence leads: it is what the visitor would read back out of the URL.
  if (query.q) params.set(PARAM.q, query.q);
  if (query.biome) params.set(PARAM.biome, query.biome);
  if (query.minSolitudeKm !== undefined && query.minSolitudeKm > bounds.minKm) {
    params.set(PARAM.km, String(query.minSolitudeKm));
  }
  if (query.maxNoiseDb !== undefined && query.maxNoiseDb < bounds.maxDb) {
    params.set(PARAM.db, String(query.maxNoiseDb));
  }
  if (query.maxBortle !== undefined && query.maxBortle < bounds.maxBortle) {
    params.set(PARAM.sky, String(query.maxBortle));
  }
  if (query.connectivity) params.set(PARAM.signal, query.connectivity);
  if (query.guests !== undefined && query.guests > 1) {
    params.set(PARAM.sleeps, String(query.guests));
  }
  if (query.sort !== DEFAULT_SORT) params.set(PARAM.sort, query.sort);

  return params.toString();
}

export const STAYS_PATH = "/stays";

/** The URL for the current state with one or more settings changed. */
export function stayHref(
  query: StayQuery,
  patch: Partial<StayQuery>,
  bounds: SolitudeBounds,
): string {
  const search = toQuery({ ...query, ...patch }, bounds);
  return search ? `${STAYS_PATH}?${search}` : STAYS_PATH;
}

/** The same state with one filter removed. */
export function without(query: StayQuery, key: RelaxKey): StayQuery {
  const next: StayQuery = { ...query };
  delete next[key];
  return next;
}

/** The same state with the sentence dropped and every reading kept. */
export function withoutQuery(query: StayQuery): StayQuery {
  const next: StayQuery = { ...query };
  delete next.q;
  return next;
}

/**
 * Whether anything at all is narrowing the catalog. Sort does not count, and
 * neither does the sentence: `q` re-ranks the catalog and can only ever be
 * refused by the readings, so it is cleared by its own control rather than by
 * "Clear", which is about the instrument.
 */
export function isFiltered(query: StayQuery): boolean {
  return (
    query.biome !== undefined ||
    query.minSolitudeKm !== undefined ||
    query.maxNoiseDb !== undefined ||
    query.maxBortle !== undefined ||
    query.connectivity !== undefined ||
    query.guests !== undefined
  );
}
