/**
 * Display formatting. Pure, deterministic, safe on both sides of hydration.
 *
 * Nothing here does arithmetic on money in floats — cents go in as integers and
 * are split with integer operations before a decimal point is ever printed.
 * `Intl` is deliberately avoided: its output can differ between the Node build
 * and the browser, and every number on this site is rendered on the server.
 */

/**
 * 41000 -> "$410" · 41050 -> "$410.50".
 *
 * Dollars, while distances stay metric, and the split is deliberate. The
 * price is the one figure a visitor does arithmetic on, and the audience for
 * this site is American — a euro sign buys a pause for conversion at exactly
 * the moment somebody is imagining themselves in the house.
 *
 * The readings do not follow it. They are measurements, not consumer
 * quantities, and two of the five (decibels, Bortle class) have no imperial
 * form at all — converting only the distances would leave the instrument
 * panel half imperial and half metric, which is worse than either. There is
 * no currency column anywhere: cents are just integers, so this function is
 * the only place the unit is decided.
 */
export function formatPriceUsd(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const whole = Math.trunc(abs / 100);
  const fraction = abs % 100;
  // Thousands grouped by hand, not by toLocaleString: the server and the
  // browser must print the same string or hydration disagrees with itself.
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body =
    fraction === 0
      ? grouped
      : `${grouped}.${fraction < 10 ? `0${fraction}` : String(fraction)}`;
  return `${negative ? "−" : ""}$${body}`;
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

/** "three nights" · "one night". Nothing stops a minimum stay being 1. */
export function nightsWord(n: number): string {
  return `${numberWord(n)} night${n === 1 ? "" : "s"}`;
}

/** "two bedrooms" · "one bedroom". */
export function bedroomsWord(n: number): string {
  return `${numberWord(n)} bedroom${n === 1 ? "" : "s"}`;
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-11-01" -> "1 November 2026". */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const month = MONTHS[(m ?? 1) - 1] ?? "";
  return `${d} ${month} ${y}`;
}

/**
 * "2026-12-04" -> "Fri 4 Dec". Narrow enough for a column of nights in the
 * booking panel, where the year is already established by the dates above it.
 *
 * The weekday is the one part that needs a Date, and it is read back in UTC —
 * the same discipline as the rest of this section, for the same reason.
 */
export function formatShortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const weekday = WEEKDAYS[at.getUTCDay()] ?? "";
  const month = MONTHS[(m ?? 1) - 1]?.slice(0, 3) ?? "";
  return `${weekday} ${d} ${month}`;
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
