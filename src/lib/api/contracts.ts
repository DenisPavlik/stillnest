/**
 * Mirror of api/stillnest/models.py.
 *
 * These two files are kept in sync BY HAND and deliberately kept small — this
 * boundary is the main risk of the two-language split. Change them together.
 *
 * Money is always integer cents. Stay dates are always calendar dates as
 * "YYYY-MM-DD" strings, never timestamps — a stay is a range, not an instant.
 */

import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const healthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  version: z.string(),
  database_configured: z.boolean(),
});

export const availabilityRequestSchema = z.object({
  property_id: z.string(),
  check_in: isoDate,
  check_out: isoDate,
  guests: z.number().int().min(1),
});

export const nightPriceSchema = z.object({
  night: isoDate,
  price_cents: z.number().int(),
  rule_label: z.string().nullable().optional(),
});

/**
 * Why a stay was refused. Mirrors `availability.Reason` in Python, which is the
 * one place these are defined.
 *
 * Kept as a plain string array on the wire rather than an enum: an unknown
 * reason arriving from a newer Python deploy should render as "unavailable",
 * not fail the whole parse and blank the booking widget.
 */
export const UNAVAILABLE_REASONS = [
  "inverted",
  "past",
  "min_nights",
  "capacity",
  "booked",
  "blocked",
] as const;

export type UnavailableReason = (typeof UNAVAILABLE_REASONS)[number];

export const availabilityResponseSchema = z.object({
  available: z.boolean(),
  nights: z.array(nightPriceSchema).default([]),
  subtotal_cents: z.number().int().default(0),
  fees_cents: z.number().int().default(0),
  total_cents: z.number().int().default(0),
  min_nights: z.number().int().default(1),
  reasons: z.array(z.string()).default([]),
});

/* ------------------------------------------------------------------ *
 *  Calendar — GET /api/py/calendar/{property_id}?month=YYYY-MM
 * ------------------------------------------------------------------ */

const monthString = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");

export const calendarDaySchema = z.object({
  night: isoDate,
  available: z.boolean(),
  /** What this one night costs — seasonal rules apply per night. */
  price_cents: z.number().int(),
  /** The minimum a stay *starting* on this night would be held to. */
  min_nights: z.number().int(),
  rule_label: z.string().nullable().optional(),
  /** "past" | "booked" | "blocked", or null when the night is free. */
  reason: z.string().nullable().optional(),
});

export const calendarResponseSchema = z.object({
  /** Canonical uuid — the request may have been made with a slug. */
  property_id: z.string(),
  slug: z.string(),
  month: monthString,
  base_price_cents: z.number().int(),
  min_nights: z.number().int(),
  days: z.array(calendarDaySchema).default([]),
});

export const searchFiltersSchema = z.object({
  biome: z.string().nullish(),
  guests: z.number().int().nullish(),
  check_in: isoDate.nullish(),
  check_out: isoDate.nullish(),
  max_solitude_km: z.number().nullish(),
  connectivity: z.enum(["none", "weak", "full"]).nullish(),
});

export const searchRequestSchema = z.object({
  query: z.string().min(1),
  filters: searchFiltersSchema.default({}),
  limit: z.number().int().min(1).max(50).default(12),
});

export const searchResponseSchema = z.object({
  hits: z
    .array(
      z.object({
        property_id: z.string(),
        slug: z.string(),
        score: z.number(),
      }),
    )
    .default([]),
  query_understood_as: z.string().nullable().optional(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type AvailabilityRequest = z.infer<typeof availabilityRequestSchema>;
export type AvailabilityResponse = z.infer<typeof availabilityResponseSchema>;
export type CalendarDay = z.infer<typeof calendarDaySchema>;
export type CalendarResponse = z.infer<typeof calendarResponseSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
