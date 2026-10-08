import "server-only";

import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "./index";
import { orderBySlugs } from "./order";
import {
  amenities,
  availabilityBlocks,
  properties,
  propertyAmenities,
  propertyScenes,
  bookings,
  savedStays,
} from "./schema";

/**
 * Read side of the catalog.
 *
 * Search here is by SOLITUDE, not by bedrooms and price — that inversion is the
 * product, so it is expressed in the query layer rather than bolted on in the UI.
 *
 * "Search by feeling" (free text -> embedding -> pgvector) is NOT here. It lives
 * in the Python service; this layer stays deterministic. What this layer does for
 * it is `staysBySlugs` — read the houses it ranked, in the order it ranked them,
 * and hold them to the same WHERE clause everything else on the page obeys.
 */

export type Biome = (typeof properties.$inferSelect)["biome"];
export type Connectivity = (typeof properties.$inferSelect)["connectivity"];

export const BIOMES = [
  "forest",
  "snow",
  "desert",
  "bamboo",
  "coast",
  "highland",
] as const satisfies readonly Biome[];

export const CONNECTIVITY = ["none", "weak", "full"] as const;

/** Ranked by distance, never by view. */
export type StaySort = "number" | "solitude" | "silence" | "dark-sky" | "price";

export interface StayFilters {
  biome?: Biome;
  /** Only stays at least this far from the nearest dwelling. */
  minSolitudeKm?: number;
  /** Only stays this quiet or quieter — lower dB is quieter. */
  maxNoiseDb?: number;
  /** Bortle is inverted: 1 is the darkest sky, so this is a ceiling. */
  maxBortle?: number;
  connectivity?: Connectivity;
  guests?: number;
  sort?: StaySort;
}

export interface StayCard {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  biome: Biome;
  country: string;
  region: string;
  capacity: number;
  basePriceCents: number;
  solitudeKm: number;
  noiseDb: number;
  connectivity: Connectivity;
  bortle: number;
  posterPath: string | null;
}

const ORDER = {
  // The collection's own sequence, 01-12, read off the slug's trailing digits
  // so the number is said once, in the name, and never stored twice.
  number: asc(sql`CAST(substring(${properties.slug} from '[0-9]+$') AS integer)`),
  solitude: desc(properties.solitudeKm),
  silence: asc(properties.noiseDb),
  "dark-sky": asc(properties.bortle),
  price: asc(properties.basePriceCents),
} as const satisfies Record<StaySort, unknown>;

function whereFor(filters: StayFilters) {
  const clauses = [eq(properties.status, "live")];

  if (filters.biome) clauses.push(eq(properties.biome, filters.biome));
  if (filters.minSolitudeKm !== undefined) {
    clauses.push(gte(properties.solitudeKm, filters.minSolitudeKm));
  }
  if (filters.maxNoiseDb !== undefined) {
    clauses.push(lte(properties.noiseDb, filters.maxNoiseDb));
  }
  if (filters.maxBortle !== undefined) {
    clauses.push(lte(properties.bortle, filters.maxBortle));
  }
  if (filters.connectivity) {
    clauses.push(eq(properties.connectivity, filters.connectivity));
  }
  if (filters.guests !== undefined) {
    clauses.push(gte(properties.capacity, filters.guests));
  }

  return and(...clauses);
}

/**
 * The columns behind one card.
 *
 * The hero poster comes from the property's `exterior` scene. A correlated
 * subquery keeps it to one round trip and, unlike a join on property_scenes,
 * cannot multiply rows when a property gains more scenes later.
 */
function cardColumns() {
  const poster = db
    .select({ path: propertyScenes.posterPath })
    .from(propertyScenes)
    .where(
      and(
        eq(propertyScenes.propertyId, properties.id),
        eq(propertyScenes.kind, "exterior"),
      ),
    )
    .orderBy(asc(propertyScenes.sort))
    .limit(1);

  return {
    id: properties.id,
    slug: properties.slug,
    name: properties.name,
    tagline: properties.tagline,
    biome: properties.biome,
    country: properties.country,
    region: properties.region,
    capacity: properties.capacity,
    basePriceCents: properties.basePriceCents,
    solitudeKm: properties.solitudeKm,
    noiseDb: properties.noiseDb,
    connectivity: properties.connectivity,
    bortle: properties.bortle,
    posterPath: sql<string | null>`(${poster})`,
  };
}

export async function listStays(filters: StayFilters = {}): Promise<StayCard[]> {
  return db
    .select(cardColumns())
    .from(properties)
    .where(whereFor(filters))
    .orderBy(ORDER[filters.sort ?? "number"]);
}

/**
 * The same cards as `listStays`, for a list of slugs, **in the order given**.
 *
 * That order is the whole point: it is a ranking computed elsewhere — by
 * semantic search, over meaning rather than metres — and SQL is asked only for
 * membership, never for sequence. No `ORDER BY` is issued at all; the ranking is
 * re-applied over the returned rows by `orderBySlugs`.
 *
 * `filters` is not optional decoration either. Similarity ranks, it never
 * admits: the Python service enforces the filters it understands, and the rest
 * of the console — the distance floor, the noise ceiling, the sky class — is
 * enforced right here, so a house can never appear on this page in defiance of a
 * reading the visitor set. A slug that fails any of them is simply not returned.
 */
export async function staysBySlugs(
  slugs: string[],
  filters: StayFilters = {},
): Promise<StayCard[]> {
  if (slugs.length === 0) return [];

  const rows = await db
    .select(cardColumns())
    .from(properties)
    .where(and(whereFor(filters), inArray(properties.slug, slugs)));

  return orderBySlugs(rows, slugs);
}

export async function countStays(filters: StayFilters = {}): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(properties)
    .where(whereFor(filters));
  return row?.n ?? 0;
}

/** The range each slider should span — derived from the data, never hardcoded. */
export async function solitudeBounds() {
  const [row] = await db
    .select({
      minKm: sql<number>`min(${properties.solitudeKm})`,
      maxKm: sql<number>`max(${properties.solitudeKm})`,
      minDb: sql<number>`min(${properties.noiseDb})`,
      maxDb: sql<number>`max(${properties.noiseDb})`,
      minBortle: sql<number>`min(${properties.bortle})`,
      maxBortle: sql<number>`max(${properties.bortle})`,
      maxGuests: sql<number>`max(${properties.capacity})`,
    })
    .from(properties)
    .where(eq(properties.status, "live"));

  return {
    minKm: Math.floor(row?.minKm ?? 0),
    maxKm: Math.ceil(row?.maxKm ?? 100),
    minDb: Math.floor(row?.minDb ?? 20),
    maxDb: Math.ceil(row?.maxDb ?? 60),
    minBortle: row?.minBortle ?? 1,
    maxBortle: row?.maxBortle ?? 9,
    maxGuests: row?.maxGuests ?? 8,
  };
}

export async function biomeCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ biome: properties.biome, n: count() })
    .from(properties)
    .where(eq(properties.status, "live"))
    .groupBy(properties.biome);

  return Object.fromEntries(rows.map((r) => [r.biome, r.n]));
}

/* ------------------------------------------------------------------ */

export async function getStayBySlug(slug: string) {
  const [property] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.slug, slug), eq(properties.status, "live")))
    .limit(1);

  if (!property) return null;

  const [scenes, amenityRows, blocks] = await Promise.all([
    db
      .select()
      .from(propertyScenes)
      .where(eq(propertyScenes.propertyId, property.id))
      .orderBy(asc(propertyScenes.sort)),
    db
      .select({
        slug: amenities.slug,
        label: amenities.label,
        icon: amenities.icon,
      })
      .from(propertyAmenities)
      .innerJoin(amenities, eq(amenities.id, propertyAmenities.amenityId))
      .where(eq(propertyAmenities.propertyId, property.id))
      .orderBy(asc(amenities.label)),
    db
      .select({
        startsOn: availabilityBlocks.startsOn,
        endsOn: availabilityBlocks.endsOn,
        reason: availabilityBlocks.reason,
        note: availabilityBlocks.note,
      })
      .from(availabilityBlocks)
      .where(eq(availabilityBlocks.propertyId, property.id))
      .orderBy(asc(availabilityBlocks.startsOn)),
  ]);

  // `embedding` is a 1536-float array — never ship it to the client.
  const { embedding: _embedding, ...rest } = property;

  return { ...rest, scenes, amenities: amenityRows, blocks };
}

export type Stay = NonNullable<Awaited<ReturnType<typeof getStayBySlug>>>;

/** Slugs for generateStaticParams. */
export async function allStaySlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: properties.slug })
    .from(properties)
    .where(eq(properties.status, "live"));
  return rows.map((r) => r.slug);
}

/** "Three of twelve" — the home page strip, and detail-page siblings. */
export async function featuredStays(limit = 3, excludeSlug?: string) {
  const clauses = [eq(properties.status, "live")];
  if (excludeSlug) {
    clauses.push(sql`${properties.slug} <> ${excludeSlug}`);
  }

  return db
    .select({
      slug: properties.slug,
      name: properties.name,
      tagline: properties.tagline,
      biome: properties.biome,
      country: properties.country,
      region: properties.region,
      basePriceCents: properties.basePriceCents,
      solitudeKm: properties.solitudeKm,
      noiseDb: properties.noiseDb,
      connectivity: properties.connectivity,
      bortle: properties.bortle,
    })
    .from(properties)
    .where(and(...clauses))
    .orderBy(desc(properties.solitudeKm))
    .limit(limit);
}

/** Used by the biome tabs to avoid offering a filter that returns nothing. */
export async function liveBiomes(): Promise<Biome[]> {
  const rows = await db
    .selectDistinct({ biome: properties.biome })
    .from(properties)
    .where(eq(properties.status, "live"));
  return rows.map((r) => r.biome);
}


/* ------------------------------------------------------------------ *
 *  Saved houses — a guest's shortlist.
 *
 *  Keyed by slug at this boundary because slugs are what the page knows;
 *  the id lookup happens here, once, rather than in every caller. A save
 *  is idempotent and so is an unsave: the composite primary key makes a
 *  double click a no-op instead of an error.
 * ------------------------------------------------------------------ */

export async function savedStaysFor(userId: string): Promise<StayCard[]> {
  return db
    .select(cardColumns())
    .from(savedStays)
    .innerJoin(properties, eq(properties.id, savedStays.propertyId))
    .where(and(eq(savedStays.userId, userId), eq(properties.status, "live")))
    .orderBy(desc(savedStays.createdAt));
}

export async function isStaySaved(userId: string, slug: string): Promise<boolean> {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(savedStays)
    .innerJoin(properties, eq(properties.id, savedStays.propertyId))
    .where(and(eq(savedStays.userId, userId), eq(properties.slug, slug)));
  return Boolean(row);
}

export async function setStaySaved(userId: string, slug: string, saved: boolean): Promise<void> {
  const [property] = await db
    .select({ id: properties.id })
    .from(properties)
    .where(and(eq(properties.slug, slug), eq(properties.status, "live")));
  if (!property) return;

  if (saved) {
    await db
      .insert(savedStays)
      .values({ userId, propertyId: property.id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(savedStays)
      .where(and(eq(savedStays.userId, userId), eq(savedStays.propertyId, property.id)));
  }
}

/* ------------------------------------------------------------------ *
 *  Bookings — written without payment (a concept has no checkout).
 *
 *  Confirmed on insert: there is no pending hold to expire, because there
 *  is no payment to wait for. Whether the nights are free is NOT checked
 *  here — the EXCLUDE constraint on `bookings` answers that, atomically,
 *  and the caller turns its refusal into a sentence.
 * ------------------------------------------------------------------ */

export async function createBooking(values: {
  propertyId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  subtotalCents: number;
  feesCents: number;
}): Promise<void> {
  await db.insert(bookings).values({ ...values, status: "confirmed" });
}

export interface MyStay {
  id: string;
  slug: string;
  house: string;
  region: string;
  country: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalCents: number;
  status: "pending" | "confirmed" | "cancelled" | "expired";
}

export async function staysFor(userId: string): Promise<MyStay[]> {
  return db
    .select({
      id: bookings.id,
      slug: properties.slug,
      house: properties.name,
      region: properties.region,
      country: properties.country,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      nights: sql<number>`${bookings.nights}`,
      guests: bookings.guests,
      totalCents: sql<number>`${bookings.totalCents}`,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .where(eq(bookings.userId, userId))
    .orderBy(asc(bookings.checkIn));
}

/** Cancel one of the guest's own stays. The user id is in the WHERE, so a
    guessed booking id belonging to someone else updates nothing. */
export async function cancelBooking(userId: string, bookingId: string): Promise<void> {
  await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));
}
