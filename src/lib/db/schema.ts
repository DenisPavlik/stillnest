/**
 * Drizzle schema — filled in Phase 2 (see the data model in the project notes).
 *
 * Two things this file will NOT own, because Drizzle cannot express them and
 * they are the parts that actually matter:
 *
 *   1. `properties.embedding vector(1536)` — pgvector, added by raw SQL migration.
 *   2. The overlap constraint on `bookings`, added by raw SQL migration:
 *
 *        CREATE EXTENSION IF NOT EXISTS btree_gist;
 *        ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
 *        EXCLUDE USING gist (
 *          property_id WITH =,
 *          daterange(check_in, check_out, '[)') WITH &&
 *        ) WHERE (status IN ('pending', 'confirmed'));
 *
 * The half-open range '[)' is what lets one guest check out and another check in
 * on the same day. Double-booking is prevented by the database, not by app code.
 */

export {};
