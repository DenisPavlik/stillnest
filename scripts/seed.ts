/**
 * Seed the catalog.
 *
 * Twelve houses. **Real regions, invented houses** — a real region ("Hardangervidda,
 * Norway") makes a visitor think "I know where that is"; an invented geography reads
 * as fantasy and quietly costs the whole site its credibility. The buildings, the
 * survey figures and the prices are fiction, and the site says so.
 *
 * Idempotent: it clears the tables it owns and rewrites them, so it is safe to run
 * repeatedly while the shape of the data is still moving.
 *
 *   pnpm db:seed
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

import {
  amenities,
  availabilityBlocks,
  bookings,
  pricingRules,
  properties,
  propertyAmenities,
  propertyImages,
  propertyScenes,
} from "../src/lib/db/schema.ts";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const db = drizzle(neon(process.env.DATABASE_URL));

/* ------------------------------------------------------------------ */

const AMENITIES = [
  { slug: "wood-stove", label: "Wood stove", icon: "flame" },
  { slug: "sauna", label: "Sauna", icon: "steam" },
  { slug: "off-grid-power", label: "Off-grid power", icon: "sun" },
  { slug: "well-water", label: "Well water", icon: "drop" },
  { slug: "reading-room", label: "Reading room", icon: "book" },
  { slug: "outdoor-bath", label: "Outdoor bath", icon: "bath" },
  { slug: "skis-provided", label: "Skis provided", icon: "ski" },
  { slug: "boat", label: "Boat", icon: "boat" },
  { slug: "telescope", label: "Telescope", icon: "star" },
  { slug: "no-wifi", label: "No wifi, on purpose", icon: "signal-off" },
];

type Biome = "forest" | "snow" | "desert" | "bamboo" | "coast" | "highland";
type Signal = "none" | "weak" | "full";

interface Seed {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  biome: Biome;
  country: string;
  region: string;
  lat: number;
  lng: number;
  capacity: number;
  bedrooms: number;
  priceUsd: number;
  minNights: number;
  solitudeKm: number;
  noiseDb: number;
  connectivity: Signal;
  bortle: number;
  amenities: string[];
}

const HOUSES: Seed[] = [
  {
    slug: "hollowmoss-04",
    name: "Hollowmoss 04",
    tagline: "Old spruce, black standing water, and a track that stops short.",
    description:
      "A low timber house on the edge of standing water that has never been drained. The road gives up nine kilometres out; the last stretch is walked. Old spruce on three sides, and on the fourth a clearing that holds mist until noon. The stove is lit before you arrive.",
    biome: "forest",
    country: "Sweden",
    region: "Jämtland",
    lat: 63.68,
    lng: 13.1,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 310,
    minNights: 3,
    solitudeKm: 34,
    noiseDb: 32,
    connectivity: "none",
    bortle: 2,
    amenities: ["wood-stove", "sauna", "well-water", "no-wifi", "reading-room"],
  },
  {
    slug: "blackwater-11",
    name: "Blackwater 11",
    tagline: "Nine kilometres past where the plough turns around.",
    description:
      "Concrete and black timber, set low against a shield of pine. From November the road is not cleared, so you arrive on skis or you do not arrive. Inside it opens upward: a sleeping mezzanine over a double-height room, a table long enough for four, glass from floor to roofline facing nothing but trees. The sauna off the deck is fired with wood and takes two hours to come up. The stove takes four to give up its heat.",
    biome: "forest",
    country: "Finland",
    region: "Kuusamo",
    lat: 66.07,
    lng: 29.19,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 290,
    minNights: 3,
    solitudeKm: 22,
    noiseDb: 31,
    connectivity: "none",
    bortle: 3,
    amenities: ["wood-stove", "sauna", "skis-provided", "no-wifi", "telescope"],
  },
  {
    slug: "tidebreak-03",
    name: "Tidebreak 03",
    tagline: "Bolted to basalt above a bay with no landing.",
    description:
      "There is no beach here and no way down. The house is anchored to rock above open water, and the only thing that arrives unannounced is weather — which announces itself for hours first. Glass on the seaward side is rated for it. So is the coffee.",
    biome: "coast",
    country: "Iceland",
    region: "Westfjords",
    lat: 65.99,
    lng: -23.2,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 295,
    minNights: 2,
    solitudeKm: 27,
    noiseDb: 38,
    connectivity: "weak",
    bortle: 3,
    amenities: ["wood-stove", "outdoor-bath", "well-water", "no-wifi"],
  },
  {
    slug: "whitehour-08",
    name: "Whitehour 08",
    tagline: "The ground here is warm. Nothing else is.",
    description:
      "Rhyolite country: ochre, rust and sulphur-yellow hills with steam coming out of the ground between them, and snow lying in the shadows of both. The house is a long low curve of concrete and glass following the slope, with four beds and a wall you can put your hand on to feel the mountain heating it. The pool below it is fed by the same ground and never goes cold, which is the only argument the place makes for itself. Above it, on a clear night, there is nothing overhead but the whole sky.",
    biome: "highland",
    country: "Iceland",
    region: "Kerlingarfjöll",
    lat: 64.64,
    lng: -19.31,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 360,
    minNights: 3,
    solitudeKm: 61,
    noiseDb: 26,
    connectivity: "none",
    bortle: 1,
    amenities: ["wood-stove", "outdoor-bath", "telescope", "no-wifi"],
  },
  {
    slug: "rimefall-02",
    name: "Rimefall 02",
    tagline: "A plateau that has never agreed to be crossed quickly.",
    description:
      "Set on open ground where the snow arrives sideways and stays until June. The nearest lit window belongs to a weather station that has been unmanned since 2019. Inside: one great room under a single span, a stove at the middle of it, a window the size of the wall, and a floor warm enough to sit on. Two sleeping rooms are cut into the bank behind, out of the wind.",
    biome: "snow",
    country: "Norway",
    region: "Hardangervidda",
    lat: 60.2,
    lng: 7.5,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 340,
    minNights: 3,
    solitudeKm: 48,
    noiseDb: 24,
    connectivity: "none",
    bortle: 2,
    amenities: ["wood-stove", "sauna", "skis-provided", "telescope", "no-wifi"],
  },
  {
    slug: "meridian-05",
    name: "Meridian 05",
    tagline: "Gravel that has not seen rain since 1997, and a stair to the roof.",
    description:
      "The driest inhabited place on the planet, and the house is built entirely around the four hours a day it is unbearable. Concrete cast with the sand it stands on, pressed into the base of a rock escarpment: two bedrooms cut back into the thick wall, a living room set three metres behind its own roof so the glass never meets the sun, and between them a walled court roofed in timber slats, where the light arrives in stripes and a channel of water runs the length of one wall. Sliding shutters decide how much of any of it you want. Noon to four you are in the court; at five the escarpment takes the sun off the plunge pool; at nine you climb the stair to the roof, where there is a telescope and nothing at all between you and the sky. Bring the warm layer — the temperature falls off a cliff at dusk.",
    biome: "desert",
    country: "Chile",
    region: "Atacama",
    lat: -24.5,
    lng: -69.25,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 410,
    minNights: 2,
    solitudeKm: 88,
    noiseDb: 21,
    connectivity: "weak",
    bortle: 1,
    amenities: ["telescope", "off-grid-power", "outdoor-bath", "no-wifi"],
  },
  {
    slug: "hollow-cedar-07",
    name: "Hollow Cedar 07",
    tagline: "Bamboo on every side, and the sound it makes before rain.",
    description:
      "A long house under one deep-eaved roof, lifted a metre off the valley floor on cedar posts, on the old pilgrim route. The grove moves constantly and is never loud. Rain gives about a minute of warning, arriving first as a change in the sound and then as the thing itself — and then you do not move, because the veranda runs the whole length of the house and the eave reaches far enough past it that the paper screens stay open through the entire storm. Rain shutters slide out of their end compartments when the weather turns serious. At the far end, under the same roof, a cedar tub fed from the spring above the house by a bamboo pipe that never quite stops running.",
    biome: "bamboo",
    country: "Japan",
    region: "Kii Peninsula",
    lat: 33.84,
    lng: 135.77,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 330,
    minNights: 2,
    solitudeKm: 14,
    noiseDb: 34,
    connectivity: "weak",
    bortle: 4,
    amenities: ["outdoor-bath", "reading-room", "well-water", "no-wifi"],
  },
  {
    slug: "moss-verse-01",
    name: "Moss Verse 01",
    tagline: "A forest that has been left alone for seven thousand years.",
    description:
      "Built on posts above ground too old and too wet to build on properly. It rains thirty-five days a month here, locals say, and the moss has taken every surface that stopped moving. The house is dry, warm, and entirely surrounded by the sound of water finding its way down.",
    biome: "forest",
    country: "Japan",
    region: "Yakushima",
    lat: 30.34,
    lng: 130.52,
    capacity: 3,
    bedrooms: 1,
    priceUsd: 305,
    minNights: 2,
    solitudeKm: 11,
    noiseDb: 39,
    connectivity: "weak",
    bortle: 4,
    amenities: ["outdoor-bath", "reading-room", "no-wifi", "well-water"],
  },
  {
    slug: "kaldbak-09",
    name: "Kaldbak 09",
    tagline: "Turf roof, dry stone walls, one deep window facing the sound.",
    description:
      "Sixty metres of black cliff between the doorstep and a sea that nobody has ever swum in. The turf roof is not decoration — it is the only thing that has ever held here; the weight of the sod is what keeps a roof on a hill that sees forty gales a winter. On the weather side it comes down almost to the grass, so the house shows the wind a slope and nothing to catch. On the sheltered side it stands up into a tall gable of tarred black boards, white window frames, and one window seat cut deep into a wall you could not reach across. The terrace and its tub sit inside a curved bank of earth, which is the only reason you can sit out there at all. Wind is constant and becomes, after about a day, indistinguishable from silence.",
    biome: "coast",
    country: "Faroe Islands",
    region: "Streymoy",
    lat: 62.11,
    lng: -6.85,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 265,
    minNights: 2,
    solitudeKm: 17,
    noiseDb: 41,
    connectivity: "weak",
    bortle: 3,
    amenities: ["wood-stove", "outdoor-bath", "boat", "well-water", "no-wifi"],
  },
  {
    slug: "sparv-12",
    name: "Sparv 12",
    tagline: "Granite, black water, and a track that stops nine kilometres short.",
    description:
      "A reserve with no through road and no reason for anyone to pass. The house sits on granite above a tarn that never thaws properly, and the last nine kilometres are walked whatever the season. A shuttered forestry hut is the nearest building; nobody has wintered in it since 2011.",
    biome: "forest",
    country: "Sweden",
    region: "Rogen Reserve",
    lat: 62.32,
    lng: 12.43,
    capacity: 5,
    bedrooms: 2,
    priceUsd: 320,
    minNights: 3,
    solitudeKm: 41,
    noiseDb: 29,
    connectivity: "none",
    bortle: 2,
    amenities: ["wood-stove", "sauna", "boat", "no-wifi", "reading-room"],
  },
  {
    slug: "quiet-fern-06",
    name: "Quiet Fern 06",
    tagline: "Button grass to the horizon, and a day's walk back to the road.",
    description:
      "Southwest Tasmania keeps some of the cleanest air ever measured and almost no people at all. The house runs long and low across open button-grass moorland with nothing anywhere to break the horizon: two wings on one concrete plinth, insulated past the point of reason, and glazed the whole length of the ridge so both bedrooms lie under the sky. The dark here is class 1 — on a clear night the Milky Way throws a shadow, and the aurora australis comes up out of the south. The walk in takes most of a day. That is not an inconvenience, it is the filter.",
    biome: "highland",
    country: "Australia",
    region: "Southwest Tasmania",
    lat: -43.05,
    lng: 146.2,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 375,
    minNights: 4,
    solitudeKm: 73,
    noiseDb: 23,
    connectivity: "none",
    bortle: 1,
    amenities: ["wood-stove", "well-water", "telescope", "no-wifi"],
  },
  {
    slug: "driftline-10",
    name: "Driftline 10",
    tagline: "Black rock above a fjord that nobody has a reason to enter.",
    description:
      "The wind is the only thing here that arrives without asking first. The whole house floats: one long room glazed down its entire length, a separate sauna at the other end of the deck, and between them a sunken pool cut into the boards with the black fjord a step away over the edge. It moves, very slightly, all the time, and you stop noticing on the second day. A covered walkway takes you to the rock when you want it, and a boat is tied along the outer edge. In winter the light lasts about three hours and is worth all of them; for the other twenty-one this is the only lit thing for nineteen kilometres.",
    biome: "coast",
    country: "Norway",
    region: "Lofoten",
    lat: 68.15,
    lng: 13.6,
    capacity: 4,
    bedrooms: 2,
    priceUsd: 355,
    minNights: 2,
    solitudeKm: 19,
    noiseDb: 37,
    connectivity: "weak",
    bortle: 3,
    amenities: ["wood-stove", "outdoor-bath", "boat", "sauna", "no-wifi"],
  },
];

/* ------------------------------------------------------------------ */

async function main() {
  console.log("clearing…");
  // Order matters: children before parents. Bookings hold the properties with
  // ON DELETE RESTRICT, so a reseed drops them first — run
  // scripts/demo_bookings.py afterwards to put the demonstration season back.
  await db.delete(bookings);
  await db.delete(propertyAmenities);
  await db.delete(propertyScenes);
  await db.delete(propertyImages);
  await db.delete(pricingRules);
  await db.delete(availabilityBlocks);
  await db.delete(properties);
  await db.delete(amenities);

  console.log("amenities…");
  const insertedAmenities = await db
    .insert(amenities)
    .values(AMENITIES)
    .returning({ id: amenities.id, slug: amenities.slug });
  const amenityId = new Map(insertedAmenities.map((a) => [a.slug, a.id]));

  console.log("properties…");
  const rows = await db
    .insert(properties)
    .values(
      HOUSES.map((h) => ({
        slug: h.slug,
        name: h.name,
        tagline: h.tagline,
        description: h.description,
        biome: h.biome,
        country: h.country,
        region: h.region,
        lat: h.lat,
        lng: h.lng,
        capacity: h.capacity,
        bedrooms: h.bedrooms,
        basePriceCents: h.priceUsd * 100,
        minNights: h.minNights,
        solitudeKm: h.solitudeKm,
        noiseDb: h.noiseDb,
        connectivity: h.connectivity,
        bortle: h.bortle,
        status: "live" as const,
      })),
    )
    .returning({ id: properties.id, slug: properties.slug });

  const propId = new Map(rows.map((r) => [r.slug, r.id]));

  console.log("amenity links…");
  await db.insert(propertyAmenities).values(
    HOUSES.flatMap((h) =>
      h.amenities.map((slug) => ({
        propertyId: propId.get(h.slug)!,
        amenityId: amenityId.get(slug)!,
      })),
    ),
  );

  console.log("scenes…");
  // Media KEYS, not URLs — src/lib/media.ts resolves them. Real assets land in Phase 9.
  await db.insert(propertyScenes).values(
    HOUSES.flatMap((h) => [
      {
        propertyId: propId.get(h.slug)!,
        kind: "exterior" as const,
        posterPath: `stays/${h.slug}/exterior.jpg`,
        caption: `${h.name}, from the approach`,
        sort: 0,
      },
      {
        propertyId: propId.get(h.slug)!,
        kind: "interior" as const,
        posterPath: `stays/${h.slug}/interior.jpg`,
        caption: "The stove, lit",
        sort: 1,
      },
    ]),
  );

  console.log("images…");
  await db.insert(propertyImages).values(
    HOUSES.map((h) => ({
      propertyId: propId.get(h.slug)!,
      path: `stays/${h.slug}/exterior.jpg`,
      alt: `${h.name} — ${h.region}, ${h.country}`,
      sort: 0,
      isHero: true,
    })),
  );

  console.log("pricing rules…");
  // A deliberately awkward pair: overlapping seasons on one property would be a
  // bug, so these are adjacent. Winter costs more and asks for longer stays.
  await db.insert(pricingRules).values(
    HOUSES.flatMap((h) => [
      {
        propertyId: propId.get(h.slug)!,
        startsOn: "2026-12-01",
        endsOn: "2027-03-01",
        priceCents: Math.round(h.priceUsd * 100 * 1.35),
        minNights: h.minNights + 1,
        label: "Deep winter",
      },
      {
        propertyId: propId.get(h.slug)!,
        startsOn: "2027-06-15",
        endsOn: "2027-08-20",
        priceCents: Math.round(h.priceUsd * 100 * 1.2),
        minNights: null,
        label: "Light season",
      },
    ]),
  );

  console.log("blocks…");
  await db.insert(availabilityBlocks).values([
    {
      propertyId: propId.get("whitehour-08")!,
      startsOn: "2026-11-01",
      endsOn: "2027-04-15",
      reason: "owner" as const,
      note: "Road uncleared; access on skis only, not offered.",
    },
    {
      propertyId: propId.get("hollowmoss-04")!,
      startsOn: "2026-09-14",
      endsOn: "2026-09-21",
      reason: "maintenance" as const,
      note: "Stove reline.",
    },
  ]);

  const counts = {
    properties: rows.length,
    amenities: insertedAmenities.length,
  };
  console.log("done:", counts);
}

await main();
