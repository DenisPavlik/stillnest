import Link from "next/link";

/**
 * Scaffolding, not design — an index for browsing the Phase 0 directions.
 * Delete this route (and its siblings) once a direction is chosen.
 */

const DIRECTIONS = [
  {
    slug: "cold-instrument",
    name: "Cold Instrument",
    note: "Near-black, monochrome, clinical. The Solitude Index as a readout.",
  },
  {
    slug: "nocturne",
    name: "Nocturne",
    note: "Deep night, one warm window a long way off.",
  },
  {
    slug: "forest-nocturne",
    name: "Forest Nocturne",
    note: "Spruce at dusk, a lit window, and the distance to the nearest other one.",
  },
  {
    slug: "field-station",
    name: "Field Station",
    note: "A field notebook kept by someone who actually goes to these places.",
  },
  {
    slug: "still-water",
    name: "Still Water",
    note: "One waterline. Everything stands on it and echoes below it.",
  },
];

export default function DirectionsIndex() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#0b0b0c",
        color: "#e8e8ea",
        padding: "clamp(2rem, 6vw, 6rem)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <p
        style={{
          fontSize: "0.6875rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#6f7075",
          marginBottom: "2.5rem",
        }}
      >
        Stillnest · Phase 0 · visual directions
      </p>

      <ul style={{ display: "grid", gap: "1px", background: "#232427", listStyle: "none" }}>
        {DIRECTIONS.map((d) => (
          <li key={d.slug} style={{ background: "#0b0b0c" }}>
            <Link
              href={`/directions/${d.slug}`}
              style={{
                display: "block",
                padding: "1.75rem 0",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", letterSpacing: "-0.02em" }}>
                {d.name}
              </span>
              <span style={{ display: "block", color: "#8b8c92", marginTop: "0.5rem" }}>
                {d.note}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
