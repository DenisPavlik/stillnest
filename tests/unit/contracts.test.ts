/**
 * The Zod schemas in src/lib/api/contracts.ts mirror the Pydantic models in
 * api/stillnest/models.py BY HAND. That boundary is the main drift risk of the
 * two-language split, so these tests pin the shape: dates must be calendar dates,
 * money must be integer cents, and defaults must match the Python side.
 */

import { describe, expect, it } from "vitest";

import {
  availabilityRequestSchema,
  availabilityResponseSchema,
  searchRequestSchema,
} from "@/lib/api/contracts";

describe("availabilityRequestSchema", () => {
  it("accepts calendar dates", () => {
    const parsed = availabilityRequestSchema.parse({
      property_id: "aurora",
      check_in: "2026-09-01",
      check_out: "2026-09-04",
      guests: 2,
    });
    expect(parsed.check_out).toBe("2026-09-04");
  });

  it("rejects a timestamp — a stay is a range, not an instant", () => {
    expect(() =>
      availabilityRequestSchema.parse({
        property_id: "aurora",
        check_in: "2026-09-01T14:00:00Z",
        check_out: "2026-09-04",
        guests: 2,
      }),
    ).toThrow();
  });

  it("rejects zero guests", () => {
    expect(() =>
      availabilityRequestSchema.parse({
        property_id: "aurora",
        check_in: "2026-09-01",
        check_out: "2026-09-04",
        guests: 0,
      }),
    ).toThrow();
  });
});

describe("availabilityResponseSchema", () => {
  it("fills the same defaults as the Pydantic model", () => {
    const parsed = availabilityResponseSchema.parse({ available: false });

    expect(parsed.nights).toEqual([]);
    expect(parsed.subtotal_cents).toBe(0);
    expect(parsed.total_cents).toBe(0);
    expect(parsed.min_nights).toBe(1);
    expect(parsed.reasons).toEqual([]);
  });

  it("rejects fractional money — cents are integers", () => {
    expect(() =>
      availabilityResponseSchema.parse({
        available: true,
        total_cents: 19999.5,
      }),
    ).toThrow();
  });

  it("parses a full priced response", () => {
    const parsed = availabilityResponseSchema.parse({
      available: true,
      nights: [
        { night: "2026-09-01", price_cents: 24000, rule_label: "shoulder" },
        { night: "2026-09-02", price_cents: 24000, rule_label: null },
      ],
      subtotal_cents: 48000,
      fees_cents: 4800,
      total_cents: 52800,
      min_nights: 2,
      reasons: [],
    });

    const summed = parsed.nights.reduce((total, n) => total + n.price_cents, 0);
    expect(summed).toBe(parsed.subtotal_cents);
    expect(parsed.subtotal_cents + parsed.fees_cents).toBe(parsed.total_cents);
  });
});

describe("searchRequestSchema", () => {
  it("defaults limit and filters like the Python side", () => {
    const parsed = searchRequestSchema.parse({ query: "alone by a lake, snow" });
    expect(parsed.limit).toBe(12);
    expect(parsed.filters).toEqual({});
  });

  it("caps the limit", () => {
    expect(() =>
      searchRequestSchema.parse({ query: "snow", limit: 500 }),
    ).toThrow();
  });

  it("constrains connectivity to the three known values", () => {
    expect(() =>
      searchRequestSchema.parse({
        query: "snow",
        filters: { connectivity: "patchy" },
      }),
    ).toThrow();

    expect(
      searchRequestSchema.parse({
        query: "snow",
        filters: { connectivity: "none" },
      }).filters.connectivity,
    ).toBe("none");
  });
});
