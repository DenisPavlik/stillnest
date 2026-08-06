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

export const availabilityResponseSchema = z.object({
  available: z.boolean(),
  nights: z.array(nightPriceSchema).default([]),
  subtotal_cents: z.number().int().default(0),
  fees_cents: z.number().int().default(0),
  total_cents: z.number().int().default(0),
  min_nights: z.number().int().default(1),
  reasons: z.array(z.string()).default([]),
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
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
