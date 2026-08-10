/**
 * The catalog's filters live in the URL, which means the URL is a public
 * input: it gets hand-edited, truncated by chat clients, pasted from an old
 * bookmark taken before the bounds moved, and occasionally probed. None of
 * that is allowed to crash the page or to reach the query layer as a filter
 * nobody asked for.
 *
 * Two rules are being pinned here, and they are deliberately different:
 *
 *   unparseable   -> the default (no filter). "km=abc" states no intent.
 *   out of range  -> clamped into the data's own range. "km=9000" states a
 *                    real intent — as far out as you have — and answering it
 *                    with the whole catalog would be a lie about what was
 *                    asked for.
 *
 * The round trip matters as much as the parse: `toQuery` has to produce a
 * string that parses back to the same state, or the console cannot tell its
 * own navigation apart from the back button.
 */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_SORT,
  MAX_QUERY_CHARS,
  isFiltered,
  parseStayQuery,
  stayHref,
  toQuery,
  without,
  withoutQuery,
  type SolitudeBounds,
} from "@/app/stays/search-params";

/** The bounds the seeded catalog actually reports. */
const BOUNDS: SolitudeBounds = {
  minKm: 11,
  maxKm: 88,
  minDb: 21,
  maxDb: 41,
  minBortle: 1,
  maxBortle: 4,
  maxGuests: 5,
};

const parse = (raw: Record<string, string | string[] | undefined>) =>
  parseStayQuery(raw, BOUNDS);

describe("parseStayQuery — an empty or absent query", () => {
  it("filters nothing and ranks by distance", () => {
    const query = parse({});
    expect(query).toEqual({ sort: DEFAULT_SORT });
    expect(query.sort).toBe("solitude");
    expect(isFiltered(query)).toBe(false);
  });
});

describe("parseStayQuery — values it understands", () => {
  it("reads every control", () => {
    expect(
      parse({
        biome: "forest",
        km: "30",
        db: "32",
        sky: "2",
        signal: "none",
        sleeps: "4",
        sort: "price",
      }),
    ).toEqual({
      biome: "forest",
      minSolitudeKm: 30,
      maxNoiseDb: 32,
      maxBortle: 2,
      connectivity: "none",
      guests: 4,
      sort: "price",
    });
  });

  it("keeps a repeated parameter from turning into a nonsense query", () => {
    expect(parse({ km: ["40", "90"] }).minSolitudeKm).toBe(40);
  });
});

describe("parseStayQuery — values it does not understand", () => {
  it("drops anything that is not a plain integer", () => {
    for (const km of ["abc", "40.5", "1e9", "<script>", "", " ", "999999999999"]) {
      expect(parse({ km }).minSolitudeKm, km).toBeUndefined();
    }
  });

  it("drops enum values that are not options", () => {
    expect(parse({ biome: "tundra" }).biome).toBeUndefined();
    expect(parse({ signal: "maybe" }).connectivity).toBeUndefined();
  });

  it("falls back to the default sort rather than leaving the catalog unordered", () => {
    expect(parse({ sort: "hotness" }).sort).toBe(DEFAULT_SORT);
    expect(parse({ sort: "" }).sort).toBe(DEFAULT_SORT);
  });
});

describe("parseStayQuery — values outside what the data covers", () => {
  it("clamps a demand for more solitude than exists onto the furthest house", () => {
    expect(parse({ km: "9000" }).minSolitudeKm).toBe(BOUNDS.maxKm);
  });

  it("clamps a demand for more quiet than exists onto the quietest house", () => {
    expect(parse({ db: "0" }).maxNoiseDb).toBe(BOUNDS.minDb);
    expect(parse({ sky: "0" }).maxBortle).toBe(BOUNDS.minBortle);
    expect(parse({ sleeps: "999" }).guests).toBe(BOUNDS.maxGuests);
  });

  it("drops a filter that lands on its own no-op edge", () => {
    // Asking for at least the minimum, or no quieter than the loudest, or a
    // party of one, narrows nothing — so it is not a filter and must never
    // show up as one.
    expect(parse({ km: "11" }).minSolitudeKm).toBeUndefined();
    expect(parse({ km: "-40" }).minSolitudeKm).toBeUndefined();
    expect(parse({ db: "41" }).maxNoiseDb).toBeUndefined();
    expect(parse({ db: "99" }).maxNoiseDb).toBeUndefined();
    expect(parse({ sky: "4" }).maxBortle).toBeUndefined();
    expect(parse({ sky: "99" }).maxBortle).toBeUndefined();
    expect(parse({ sleeps: "1" }).guests).toBeUndefined();
    expect(parse({ sleeps: "0" }).guests).toBeUndefined();
  });
});

describe("toQuery", () => {
  it("says nothing when nothing is set", () => {
    expect(toQuery(parse({}), BOUNDS)).toBe("");
  });

  it("omits the default sort, and prints one that is not the default", () => {
    expect(toQuery(parse({ sort: "solitude" }), BOUNDS)).toBe("");
    expect(toQuery(parse({ sort: "silence" }), BOUNDS)).toBe("sort=silence");
  });

  it("puts the keys in one fixed order, whatever order they arrived in", () => {
    const written = toQuery(
      parse({ sort: "price", sleeps: "4", km: "30", biome: "forest", signal: "none" }),
      BOUNDS,
    );
    expect(written).toBe("biome=forest&km=30&signal=none&sleeps=4&sort=price");
  });

  it("round-trips: parse(toQuery(q)) is q", () => {
    const query = parse({
      biome: "coast",
      km: "27",
      db: "38",
      sky: "3",
      signal: "weak",
      sleeps: "2",
      sort: "dark-sky",
    });
    const raw = Object.fromEntries(new URLSearchParams(toQuery(query, BOUNDS)));
    expect(parseStayQuery(raw, BOUNDS)).toEqual(query);
  });

  it("round-trips a clamped value to its clamped form, not the one asked for", () => {
    const query = parse({ km: "9000" });
    expect(toQuery(query, BOUNDS)).toBe("km=88");
    expect(parse({ km: "88" })).toEqual(query);
  });
});

describe("stayHref", () => {
  it("returns the bare path when a change clears the last filter", () => {
    expect(stayHref(parse({ biome: "forest" }), { biome: undefined }, BOUNDS)).toBe("/stays");
  });

  it("keeps everything else while changing one setting", () => {
    expect(stayHref(parse({ km: "30", signal: "none" }), { biome: "snow" }, BOUNDS)).toBe(
      "/stays?biome=snow&km=30&signal=none",
    );
  });
});

describe("without", () => {
  it("removes one filter and leaves the sort alone", () => {
    const query = parse({ km: "30", signal: "none", sort: "price" });
    expect(without(query, "minSolitudeKm")).toEqual({
      connectivity: "none",
      sort: "price",
    });
  });
});

describe("isFiltered", () => {
  it("does not count the sort as a filter — a reordered catalog is still whole", () => {
    expect(isFiltered(parse({ sort: "price" }))).toBe(false);
    expect(isFiltered(parse({ sleeps: "2" }))).toBe(true);
  });

  it("does not count the sentence either — it ranks, it does not narrow", () => {
    // `q` can only ever be REFUSED by the readings; on its own it excludes
    // nothing. "Clear" is about the instrument, and the sentence has its own
    // control, so counting it here would make the wrong link appear.
    expect(isFiltered(parse({ q: "somewhere warm and green" }))).toBe(false);
  });
});

/* ==================================================================== *
 *  The sentence.
 *
 *  `q` is the one parameter a human types by hand, which makes it the one
 *  most likely to arrive padded, duplicated, empty-but-present, or pasted
 *  as an entire paragraph. Every one of those has to resolve to either a
 *  real sentence or no sentence at all — never to a request that costs an
 *  embedding call and cannot possibly return anything.
 * ==================================================================== */

describe("parseStayQuery — the sentence", () => {
  it("keeps a sentence as typed", () => {
    expect(parse({ q: "alone by a lake, snow, no signal" }).q).toBe(
      "alone by a lake, snow, no signal",
    );
  });

  it("is absent when it was not asked", () => {
    expect(parse({}).q).toBeUndefined();
  });

  it("collapses whitespace, so one sentence is one address", () => {
    expect(parse({ q: "  deep   snow \n and nothing else  " }).q).toBe(
      "deep snow and nothing else",
    );
  });

  it("treats an empty or blank sentence as no sentence at all", () => {
    // Not "a query that matches nothing" — a query that was never asked.
    // The difference is a network round trip and an empty grid.
    for (const q of ["", " ", "\t\n", "   "]) {
      expect(parse({ q }).q, JSON.stringify(q)).toBeUndefined();
    }
  });

  it("keeps a repeated parameter from turning into a nonsense query", () => {
    expect(parse({ q: ["snow", "desert"] }).q).toBe("snow");
  });

  it("cuts a pasted essay down to something embeddable and linkable", () => {
    const essay = "somewhere very quiet ".repeat(40);
    const cut = parse({ q: essay }).q;

    expect(cut).toBeDefined();
    expect(cut!.length).toBeLessThanOrEqual(MAX_QUERY_CHARS);
    expect(cut).toBe(cut!.trim());
    expect(essay.startsWith(cut!)).toBe(true);
  });
});

describe("toQuery — the sentence", () => {
  it("leads with it, because it is what the URL says out loud", () => {
    const query = parse({ q: "deep snow", biome: "snow", sort: "price" });
    expect(toQuery(query, BOUNDS)).toBe("q=deep+snow&biome=snow&sort=price");
  });

  it("round-trips a sentence with punctuation and spaces intact", () => {
    const query = parse({ q: "I want to see the Milky Way and nothing else", km: "40" });
    const raw = Object.fromEntries(new URLSearchParams(toQuery(query, BOUNDS)));

    expect(parseStayQuery(raw, BOUNDS)).toEqual(query);
  });
});

describe("clearing the sentence", () => {
  const query = parse({ q: "deep snow", biome: "snow", km: "40", sort: "price" });

  it("keeps every reading the console was set to", () => {
    expect(withoutQuery(query)).toEqual({
      biome: "snow",
      minSolitudeKm: 40,
      sort: "price",
    });
    expect(stayHref(query, { q: undefined }, BOUNDS)).toBe(
      "/stays?biome=snow&km=40&sort=price",
    );
  });

  it("survives relaxing a reading — dropping a filter is not abandoning the question", () => {
    expect(without(query, "biome").q).toBe("deep snow");
    expect(stayHref(without(query, "minSolitudeKm"), {}, BOUNDS)).toBe(
      "/stays?q=deep+snow&biome=snow&sort=price",
    );
  });
});
