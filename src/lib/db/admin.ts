import "server-only";

import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { db } from "./index";
import { availabilityBlocks, bookings, properties, users } from "./schema";

/* ==================================================================== *
 *  The admin's read side: the ledger, the calendar, the closures.
 *
 *  Separate from queries.ts because nothing here is public — every
 *  caller sits behind the role check in app/admin/layout.tsx — and so a
 *  guest-facing page can never import a query that names a guest.
 * ==================================================================== */

/** Statuses that occupy dates — the same pair the EXCLUDE constraint guards. */
export const LIVE = ["pending", "confirmed"] as const;

export interface LedgerRow {
  id: string;
  slug: string;
  house: string;
  guest: string | null;
  email: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalCents: number;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  createdAt: Date;
}

export async function ledger(): Promise<LedgerRow[]> {
  return db
    .select({
      id: bookings.id,
      slug: properties.slug,
      house: properties.name,
      guest: users.name,
      email: users.email,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      nights: sql<number>`${bookings.nights}`,
      guests: bookings.guests,
      totalCents: sql<number>`${bookings.totalCents}`,
      status: bookings.status,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(properties, eq(properties.id, bookings.propertyId))
    .innerJoin(users, eq(users.id, bookings.userId))
    .orderBy(asc(bookings.checkIn));
}

export interface HouseRow {
  id: string;
  slug: string;
  name: string;
}

export async function houses(): Promise<HouseRow[]> {
  return db
    .select({ id: properties.id, slug: properties.slug, name: properties.name })
    .from(properties)
    .where(eq(properties.status, "live"))
    .orderBy(asc(sql`CAST(substring(${properties.slug} from '[0-9]+$') AS integer)`));
}

export interface BlockRow {
  id: string;
  slug: string;
  house: string;
  startsOn: string;
  endsOn: string;
  reason: "maintenance" | "owner" | "hold";
  note: string | null;
}

export async function blocks(): Promise<BlockRow[]> {
  return db
    .select({
      id: availabilityBlocks.id,
      slug: properties.slug,
      house: properties.name,
      startsOn: availabilityBlocks.startsOn,
      endsOn: availabilityBlocks.endsOn,
      reason: availabilityBlocks.reason,
      note: availabilityBlocks.note,
    })
    .from(availabilityBlocks)
    .innerJoin(properties, eq(properties.id, availabilityBlocks.propertyId))
    .orderBy(desc(availabilityBlocks.startsOn));
}

/**
 * Live bookings a proposed closure would sit on top of. A block is not a
 * booking, so the EXCLUDE constraint does not see it — closing a house over
 * a guest's confirmed stay would be legal SQL and a broken promise, so the
 * admin is told instead.
 */
export async function bookingsInside(
  propertyId: string,
  startsOn: string,
  endsOn: string,
): Promise<{ guest: string | null; checkIn: string; checkOut: string }[]> {
  return db
    .select({ guest: users.name, checkIn: bookings.checkIn, checkOut: bookings.checkOut })
    .from(bookings)
    .innerJoin(users, eq(users.id, bookings.userId))
    .where(
      and(
        eq(bookings.propertyId, propertyId),
        inArray(bookings.status, [...LIVE]),
        lt(bookings.checkIn, endsOn),
        gt(bookings.checkOut, startsOn),
      ),
    );
}

export async function insertBlock(values: {
  propertyId: string;
  startsOn: string;
  endsOn: string;
  reason: "maintenance" | "owner" | "hold";
  note: string | null;
}): Promise<void> {
  await db.insert(availabilityBlocks).values(values);
}

export async function deleteBlock(id: string): Promise<void> {
  await db.delete(availabilityBlocks).where(eq(availabilityBlocks.id, id));
}
