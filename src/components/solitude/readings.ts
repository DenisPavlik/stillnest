import type { Biome, Connectivity, StayCard } from "@/lib/db/queries";

/* ==================================================================== *
 *  The five readings, and the language the site uses about them.
 *
 *  Everything here is a pure function of the measured values, so a house
 *  cannot be described in words that flatter it beyond what was surveyed.
 *  Type-only imports from the query layer: that file is server-only, and
 *  types are erased at compile time.
 * ==================================================================== */

export type SolitudeReadings = Pick<
  StayCard,
  "solitudeKm" | "noiseDb" | "connectivity" | "bortle" | "biome"
>;

export const BIOME_LABEL: Record<Biome, string> = {
  forest: "Forest",
  snow: "Snow",
  desert: "Desert",
  bamboo: "Bamboo",
  coast: "Coast",
  highland: "Highland",
};

/**
 * The composite the panel prints. Distance is weighted heaviest because it
 * is the only reading that cannot be improved by waiting for better weather.
 *
 * 0–100, integer, deterministic. Signal is scored inverted on purpose:
 * having none is the best possible result.
 */
export function compositeIndex(r: SolitudeReadings): number {
  const distance = clamp01(r.solitudeKm / 90);
  const quiet = clamp01((45 - r.noiseDb) / 25);
  const dark = clamp01((9 - r.bortle) / 8);
  const unreachable = r.connectivity === "none" ? 1 : r.connectivity === "weak" ? 0.5 : 0;
  return Math.round(100 * (0.4 * distance + 0.2 * quiet + 0.2 * dark + 0.2 * unreachable));
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/**
 * One cell of the Bortle scale, as it is drawn everywhere on the site:
 * ink-dark at class 1, city-pale at class 9. Index is 0-based (class − 1).
 *
 * Lives here rather than in the instrument that draws it because the catalog
 * console draws the same nine cells as a control, and the two must not drift.
 */
export function bortleFill(index: number): string {
  const lum = Math.round(7 + (index / 8) * 88);
  return `rgb(${lum}, ${Math.round(lum * 1.09 + 3)}, ${Math.round(lum * 0.97)})`;
}

/* ---------------------------- the prose ---------------------------- */

export const SOLITUDE_NOTE =
  "To the nearest permanent dwelling — measured in the direction it is closest, not the one that flatters us.";

export function silenceNote(db: number): string {
  const method = "Ambient, sixty seconds, instruments at 1.5 m.";
  if (db <= 24) return `${method} Below the noise floor of most recording booths — at this level you hear the blood in your own ears.`;
  if (db <= 32) return `${method} Quiet enough that your own pulse becomes an event.`;
  if (db <= 38) return `${method} Weather is the loudest thing that happens here, and it is not close.`;
  return `${method} Water and wind, more or less constantly. Quiet is not the same as silent.`;
}

export function signalNote(connectivity: Connectivity): string {
  switch (connectivity) {
    case "none":
      return "There is a satellite handset in the drawer by the door. In four years no guest has taken it out of its case.";
    case "weak":
      return "One bar, outside, standing in the right place. Nobody has ever managed to hold a call for longer than a minute.";
    default:
      return "A working connection, which is the one reading here we are not proud of. It can be switched off at the meter.";
  }
}

export function bortleNote(bortle: number): string {
  const head = `Class ${bortle} of 9.`;
  if (bortle <= 2) return `${head} The Milky Way throws a shadow, and on a clear night you can read the horizon by it.`;
  if (bortle <= 4) return `${head} The Milky Way is structured overhead, and the nearest town is a faint dome on one edge of the sky.`;
  return `${head} Dark enough for the constellations, not dark enough to lose them in the stars between.`;
}

export function biomeNote(biome: Biome): string {
  switch (biome) {
    case "forest":
      return "Old growth that has never been cut, and black standing water that has never been drained. The track gives up well short.";
    case "snow":
      return "A plateau under snow for two thirds of the year. From November there is no road, only a line someone else took last week.";
    case "desert":
      return "Gravel, salt and stone that has not seen rain in decades. No shade within a day's walk, and nothing that needs any.";
    case "bamboo":
      return "Bamboo on every side, thick enough to stand a storm up on end. It answers the wind before you feel it.";
    case "coast":
      return "Basalt, water on three sides and no landing. The only thing that arrives unannounced is weather, and it announces itself for hours first.";
    default:
      return "Above the last tree, where the ground stops pretending. Everything here is rock, lichen, and the weather passing over both.";
  }
}

/** The one-line legend under the biome glyph. */
export function biomeGround(biome: Biome): string {
  switch (biome) {
    case "forest":
      return "old spruce · standing water · unmade track";
    case "snow":
      return "plateau · packed snow · no cleared road";
    case "desert":
      return "gravel · salt pan · no surface water";
    case "bamboo":
      return "bamboo · steep valley · one footbridge";
    case "coast":
      return "basalt · open water · no landing";
    default:
      return "above the treeline · rock and lichen · weather";
  }
}

/**
 * Where an exterior photograph is standing, as a noun phrase for alt text.
 *
 * Deliberately at biome level rather than per house. The alt text for twelve
 * houses cannot be twelve hand-written sentences that someone remembers to add
 * — the first version of the detail page described a house "seen from across
 * the water", which is true of Hollowmoss and a lie about a salt pan. Anything
 * generated per house has to stay true for all twelve, and biome is the finest
 * grain the database actually carries.
 *
 * The rest of the sentence comes from the base prompt's constants — dusk, a low
 * timber house, one warm light from inside — which every image in the catalog
 * is generated against, so it is safe to assert.
 */
export function biomeSetting(biome: Biome): string {
  switch (biome) {
    case "forest":
      return "deep forest";
    case "snow":
      return "deep snow";
    case "desert":
      return "high desert";
    case "bamboo":
      return "a bamboo grove";
    case "coast":
      return "a cliff above open water";
    default:
      return "bare high ground above the treeline";
  }
}
