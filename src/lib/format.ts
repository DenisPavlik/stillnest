/**
 * Display formatting. Pure, deterministic, safe on both sides of hydration.
 *
 * Nothing here does arithmetic on money in floats — cents go in as integers and
 * are split with integer operations before a decimal point is ever printed.
 * `Intl` is deliberately avoided: its output can differ between the Node build
 * and the browser, and every number on this site is rendered on the server.
 */

/** 41000 -> "€410" · 41050 -> "€410.50". */
export function formatPriceEur(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.trunc(abs / 100);
  const fraction = abs % 100;
  const body =
    fraction === 0
      ? String(whole)
      : `${whole}.${fraction < 10 ? `0${fraction}` : String(fraction)}`;
  return `${negative ? "−" : ""}€${body}`;
}

/** 88 -> "88" · 12.5 -> "12.5". Distances are measured, so they never round up. */
export function formatKm(km: number): string {
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen", "twenty",
];

/**
 * 12 -> "twelve". Copy counts houses in words, never in numerals — numerals in
 * a sentence read as data, and the numerals on this site mean measurements.
 * Falls back to digits past twenty, where the word stops being shorter.
 */
export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

/** For a word that has to start a sentence. */
export function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/* ---------------------------- calendar dates ---------------------------- *
 *  Stay dates are calendar dates, never instants. Nothing below constructs a
 *  local Date from a string — `new Date("2026-11-01")` is UTC midnight, which
 *  is the previous day for anyone west of Greenwich, and that is exactly the
 *  off-by-one this project cannot afford. Parts in, parts out.
 * ------------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-01" -> "1 November 2026". */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = MONTHS[(m ?? 1) - 1] ?? "";
  return `${d} ${month} ${y}`;
}

/**
 * A half-open block `[startsOn, endsOn)` printed as the days it actually
 * covers — so a block ending 2027-04-15 says "14 April 2027", because the
 * 15th is free. Printing the exclusive end would close the house for a day
 * it is open, on the one page where that claim matters.
 *
 * "2026-11-01", "2027-04-15" -> "1 November 2026 – 14 April 2027"
 */
export function formatClosedRange(startIso: string, endIsoExclusive: string): string {
  const last = previousDay(endIsoExclusive);
  return last === startIso ? formatDay(startIso) : `${formatDay(startIso)} – ${formatDay(last)}`;
}

/** ISO day arithmetic through UTC, which has no daylight saving to get wrong. */
function previousDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) - 1);
  const back = new Date(t);
  const mm = back.getUTCMonth() + 1;
  const dd = back.getUTCDate();
  return `${back.getUTCFullYear()}-${mm < 10 ? `0${mm}` : mm}-${dd < 10 ? `0${dd}` : dd}`;
}

/**
 * -24.5, -69.25 -> "24°30′S 69°15′W".
 *
 * Degrees and minutes only. Seconds would imply a precision the survey does not
 * have, and would put a house on a map to within thirty metres — which is the
 * opposite of what this product sells.
 */
export function formatCoords(lat: number, lng: number): string {
  return `${dms(lat, "N", "S")} ${dms(lng, "E", "W")}`;
}

function dms(value: number, positive: string, negative: string): string {
  const hemisphere = value < 0 ? negative : positive;
  const abs = Math.abs(value);
  let degrees = Math.floor(abs);
  let minutes = Math.round((abs - degrees) * 60);
  if (minutes === 60) {
    degrees += 1;
    minutes = 0;
  }
  return `${degrees}°${minutes < 10 ? `0${minutes}` : minutes}′${hemisphere}`;
}
