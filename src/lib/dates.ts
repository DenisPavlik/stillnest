/**
 * Half-open `[start, end)` calendar-date arithmetic on ISO "YYYY-MM-DD" strings.
 *
 * The TypeScript twin of api/stillnest/dates.py, and deliberately as small. It
 * exists to enforce two things that this project cannot afford to get wrong:
 *
 *   * A stay is a range of CALENDAR DATES, never an instant. Nothing here builds
 *     a local Date from a string — `new Date("2026-11-01")` is UTC midnight,
 *     which is the previous day for anyone west of Greenwich. Parts in, parts
 *     out, arithmetic through UTC, which has no daylight saving to get wrong.
 *   * The range is half-open: a stay ending on the 5th and one starting on the
 *     5th do NOT collide. That is the same predicate as the database's EXCLUDE
 *     constraint, and if the two ever disagree the constraint is right.
 *
 * Client-safe on purpose — the booking panel does date arithmetic in the
 * browser, and it must do it the same way the engine does.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/**
 * True only for a date that actually exists. "2026-02-31" matches the shape and
 * is not a day — sending it to Python would come back a validation error, which
 * would be reported as "the service is down" when the request was simply wrong.
 */
export function isCalendarDate(iso: string): boolean {
  const match = ISO.exec(iso);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const back = new Date(Date.UTC(year, month - 1, day));

  return (
    back.getUTCFullYear() === year &&
    back.getUTCMonth() === month - 1 &&
    back.getUTCDate() === day
  );
}

/** Milliseconds at UTC midnight on an ISO day. Internal — dates never leak as instants. */
function utcMidnight(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function toIso(ms: number): string {
  const at = new Date(ms);
  const month = at.getUTCMonth() + 1;
  const day = at.getUTCDate();
  return `${at.getUTCFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
}

/**
 * How many nights `[checkIn, checkOut)` covers. Zero when the two dates are the
 * same and negative when they are inverted — both are answers the caller has to
 * handle, not errors to throw, because a guest can type either.
 */
export function nightCount(checkIn: string, checkOut: string): number {
  return Math.round((utcMidnight(checkOut) - utcMidnight(checkIn)) / DAY_MS);
}

/** The next calendar day. Used for the earliest check-out a check-in allows. */
export function nextDay(iso: string): string {
  return toIso(utcMidnight(iso) + DAY_MS);
}

/**
 * Do `[aStart, aEnd)` and `[bStart, bEnd)` share a night?
 *
 * ISO dates sort lexicographically in the same order they sort chronologically,
 * so this is string comparison and needs no parsing at all.
 */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
