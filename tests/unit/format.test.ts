/**
 * Money is the one thing on this site that is never allowed to be approximately
 * right, and every price the catalog prints goes through `formatPriceEur`. The
 * coordinate formatter is here for the same reason the money one is: it is the
 * only place a measured number is turned into something a human reads, so a
 * rounding mistake would show up on every page at once and nowhere else.
 */

import { describe, expect, it } from "vitest";

import {
  capitalise,
  formatClosedRange,
  formatCoords,
  formatDay,
  formatKm,
  formatPriceEur,
  numberWord,
} from "@/lib/format";

describe("formatPriceEur", () => {
  it("prints whole euros without a decimal tail", () => {
    expect(formatPriceEur(41000)).toBe("€410");
    expect(formatPriceEur(31000)).toBe("€310");
  });

  it("keeps two digits of cents when there are any", () => {
    expect(formatPriceEur(41050)).toBe("€410.50");
    expect(formatPriceEur(41005)).toBe("€410.05");
  });

  it("does not lose cents to floating point", () => {
    // 0.1 + 0.2 arithmetic is exactly what this function exists to avoid.
    expect(formatPriceEur(30)).toBe("€0.30");
    expect(formatPriceEur(1)).toBe("€0.01");
    expect(formatPriceEur(0)).toBe("€0");
  });
});

describe("formatKm", () => {
  it("leaves whole kilometres whole", () => {
    expect(formatKm(88)).toBe("88");
  });

  it("shows one decimal when the survey measured one", () => {
    expect(formatKm(12.5)).toBe("12.5");
  });
});

describe("formatCoords", () => {
  it("converts decimal degrees to degrees and minutes", () => {
    expect(formatCoords(63.68, 13.1)).toBe("63°41′N 13°06′E");
  });

  it("hemispheres come from the sign, not from the caller", () => {
    expect(formatCoords(-24.5, -69.25)).toBe("24°30′S 69°15′W");
  });

  it("carries 60 minutes into the next degree", () => {
    expect(formatCoords(62.999, 6.999)).toBe("63°00′N 7°00′E");
  });
});

describe("calendar dates", () => {
  it("prints a stored date as the day it is, in any timezone", () => {
    // new Date("2026-11-01") is UTC midnight — i.e. 31 October in New York.
    expect(formatDay("2026-11-01")).toBe("1 November 2026");
    expect(formatDay("2027-04-15")).toBe("15 April 2027");
  });

  it("closes a half-open block on its last occupied day, not the exclusive end", () => {
    expect(formatClosedRange("2026-11-01", "2027-04-15")).toBe(
      "1 November 2026 – 14 April 2027",
    );
    expect(formatClosedRange("2026-09-14", "2026-09-21")).toBe(
      "14 September 2026 – 20 September 2026",
    );
  });

  it("steps back over a month and a year boundary", () => {
    expect(formatClosedRange("2026-12-20", "2027-01-01")).toBe(
      "20 December 2026 – 31 December 2026",
    );
    expect(formatClosedRange("2028-02-01", "2028-03-01")).toBe(
      "1 February 2028 – 29 February 2028",
    );
  });

  it("prints a single-day block as one day", () => {
    expect(formatClosedRange("2026-09-14", "2026-09-15")).toBe("14 September 2026");
  });
});

describe("numberWord", () => {
  it("spells counts the copy uses", () => {
    expect(numberWord(12)).toBe("twelve");
    expect(numberWord(3)).toBe("three");
  });

  it("falls back to digits past twenty", () => {
    expect(numberWord(21)).toBe("21");
  });

  it("capitalises for the start of a sentence", () => {
    expect(capitalise(numberWord(12))).toBe("Twelve");
  });
});
