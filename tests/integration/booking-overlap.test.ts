/**
 * Proof that double-booking is impossible.
 *
 * This is the highest-value test in the project. It runs against the real
 * database, because the guarantee IS the database: an EXCLUDE constraint on
 * `bookings`, not a check in application code. A mock would prove nothing.
 *
 * What it defends against is a specific, plausible future accident — somebody
 * regenerates migrations from the Drizzle schema, the hand-written raw SQL is
 * lost (Drizzle cannot express EXCLUDE), everything still compiles, every other
 * test still passes, and the system silently starts allowing two guests into the
 * same house on the same night.
 *
 *   pnpm test:db
 *
 * Skipped automatically when DATABASE_URL is absent, so it never breaks a
 * checkout that has no database configured.
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)("bookings_no_overlap", () => {
  const sql = neon(DATABASE_URL!);

  const userId = "test-user-overlap";
  let propertyId: string;

  beforeAll(async () => {
    const [prop] = await sql`
      select id from properties where status = 'live' order by slug limit 1`;
    if (!prop) throw new Error("seed the database first: pnpm db:seed");
    propertyId = prop.id;

    await sql`
      insert into users (id, email, name)
      values (${userId}, 'overlap-test@stillnest.invalid', 'Overlap Test')
      on conflict (id) do nothing`;
  });

  afterAll(async () => {
    await sql`delete from bookings where user_id = ${userId}`;
    await sql`delete from users where id = ${userId}`;
  });

  async function book(checkIn: string, checkOut: string, status = "confirmed") {
    const [row] = await sql`
      insert into bookings
        (property_id, user_id, check_in, check_out, guests, subtotal_cents, status)
      values
        (${propertyId}, ${userId}, ${checkIn}, ${checkOut}, 2, 50000, ${status})
      returning id, nights, total_cents`;
    return row;
  }

  it("the constraint exists at all", async () => {
    const [found] = await sql`
      select conname from pg_constraint where conname = 'bookings_no_overlap'`;
    expect(
      found,
      "bookings_no_overlap is missing — regenerated migrations probably dropped the raw SQL",
    ).toBeTruthy();
  });

  it("accepts a first booking and generates its derived columns", async () => {
    const row = await book("2027-02-10", "2027-02-14");
    expect(row.nights).toBe(4); // check-out day is not a night
    expect(row.total_cents).toBe(50000); // subtotal + 0 fees, computed by Postgres
  });

  it.each([
    ["starts inside", "2027-02-12", "2027-02-18"],
    ["ends inside", "2027-02-08", "2027-02-12"],
    ["fully contains", "2027-02-01", "2027-02-28"],
    ["is contained by", "2027-02-11", "2027-02-13"],
    ["is identical", "2027-02-10", "2027-02-14"],
  ])("rejects a booking that %s an existing one", async (_label, from, to) => {
    await expect(book(from, to)).rejects.toThrow();
  });

  it("ALLOWS check-in on the day another guest checks out", async () => {
    // The half-open range '[)' is the whole point. Getting this wrong is the
    // classic off-by-one, and it would cost a night of revenue on every stay.
    const row = await book("2027-02-14", "2027-02-17");
    expect(row.nights).toBe(3);
  });

  it("ALLOWS check-out on the day another guest checks in", async () => {
    const row = await book("2027-02-07", "2027-02-10");
    expect(row.nights).toBe(3);
  });

  it("frees the dates again once a booking is cancelled", async () => {
    const held = await book("2027-05-01", "2027-05-05");
    await expect(book("2027-05-02", "2027-05-04")).rejects.toThrow();

    await sql`update bookings set status = 'cancelled' where id = ${held.id}`;

    // Cancelled rows drop out of the constraint's WHERE clause, so the range
    // is released without anyone having to delete anything.
    const rebooked = await book("2027-05-02", "2027-05-04");
    expect(rebooked.nights).toBe(2);
  });

  it("does not let an expired hold keep blocking dates", async () => {
    const hold = await book("2027-07-01", "2027-07-04", "pending");
    await expect(book("2027-07-02", "2027-07-03")).rejects.toThrow();

    await sql`update bookings set status = 'expired' where id = ${hold.id}`;
    const taken = await book("2027-07-02", "2027-07-03");
    expect(taken.nights).toBe(1);
  });

  it("refuses a stay that ends before it starts", async () => {
    await expect(book("2027-09-10", "2027-09-08")).rejects.toThrow();
  });

  it("refuses a zero-night stay", async () => {
    await expect(book("2027-09-10", "2027-09-10")).rejects.toThrow();
  });
});
