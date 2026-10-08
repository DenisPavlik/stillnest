/**
 * The ranking survives the round trip through Postgres.
 *
 * `staysBySlugs` exists because semantic search returns an ORDER and a
 * `WHERE slug = ANY($1)` returns a SET. Those are not the same thing, and the
 * gap between them is silent: rows come back in whatever order the planner
 * liked, which on a twelve-row table is usually insertion order and therefore
 * looks perfectly correct until the day it doesn't. A grid that claims to be
 * ranked by meaning while being ordered by whatever Postgres felt like is
 * worse than no search at all.
 *
 * This is the pure half of that function — the reorder — tested without a
 * database, which is exactly why it was extracted into its own module.
 */

import { describe, expect, it } from "vitest";

import { orderBySlugs } from "@/lib/db/order";

interface Row {
  slug: string;
  name: string;
}

const row = (slug: string): Row => ({ slug, name: slug.toUpperCase() });

/** What the database might hand back: the right rows, an arbitrary order. */
const ROWS: Row[] = [
  row("driftline-10"),
  row("rimefall-02"),
  row("meridian-05"),
  row("sparv-12"),
];

describe("orderBySlugs", () => {
  it("returns the rows in the order the slugs were given, not the order they arrived", () => {
    const ranked = ["rimefall-02", "sparv-12", "driftline-10"];

    expect(orderBySlugs(ROWS, ranked).map((r) => r.slug)).toEqual(ranked);
  });

  it("is unmoved by the order the rows come back in", () => {
    const ranked = ["meridian-05", "rimefall-02"];
    const shuffled = [...ROWS].reverse();

    expect(orderBySlugs(shuffled, ranked)).toEqual(orderBySlugs(ROWS, ranked));
  });

  it("drops a slug the query did not return rather than leaving a hole", () => {
    // A house the console's own filters excluded, or one taken off the map
    // between the search and the read. Missing is missing.
    const ranked = ["rimefall-02", "hollow-cedar-07", "sparv-12"];

    expect(orderBySlugs(ROWS, ranked).map((r) => r.slug)).toEqual([
      "rimefall-02",
      "sparv-12",
    ]);
  });

  it("never renders the same house twice, however the ranking repeats itself", () => {
    const ranked = ["sparv-12", "rimefall-02", "sparv-12"];

    expect(orderBySlugs(ROWS, ranked).map((r) => r.slug)).toEqual([
      "sparv-12",
      "rimefall-02",
    ]);
  });

  it("returns nothing for an empty ranking, and never the whole table", () => {
    // The one failure mode that would be invisible on screen: a search that
    // matched nothing quietly turning into "here is everything".
    expect(orderBySlugs(ROWS, [])).toEqual([]);
    expect(orderBySlugs([], ["rimefall-02"])).toEqual([]);
  });

  it("does not mutate what it was given", () => {
    const rows = [...ROWS];
    orderBySlugs(rows, ["sparv-12", "rimefall-02"]);
    expect(rows).toEqual(ROWS);
  });
});
