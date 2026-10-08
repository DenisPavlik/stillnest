import { ImageResponse } from "next/og";

import { BIOME_LABEL } from "@/components/solitude/readings";
import { getStayBySlug } from "@/lib/db/queries";
import { formatKm } from "@/lib/format";
import { INK, OG_SIZE, exteriorDataUrl, ogFonts } from "@/lib/og";
import { SITE_NAME } from "@/lib/site";

/* One house, the way the page itself opens: the place, its name, and the
   readings — because a link to a house here should arrive saying how far
   from everyone it is, not how many bedrooms it has. */

export const alt = "A Stillnest house at dusk, with its Solitude Index readings.";
export const size = OG_SIZE;
export const contentType = "image/png";

const SIGNAL = { none: "No signal", weak: "Weak signal", full: "Full signal" } as const;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [stay, photo, fonts] = await Promise.all([
    getStayBySlug(slug),
    exteriorDataUrl(slug),
    ogFonts(),
  ]);

  const readings = stay
    ? [
        `${formatKm(stay.solitudeKm)} km to anyone`,
        `${stay.noiseDb} dB`,
        `Bortle ${stay.bortle}`,
        SIGNAL[stay.connectivity],
      ]
    : [];

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: INK.spruce }}>
        {photo ? (
          <img
            src={photo}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            background:
              "linear-gradient(0deg, rgba(9,14,10,0.94) 0%, rgba(9,14,10,0.55) 42%, rgba(9,14,10,0) 72%)",
          }}
        />
        {/* A light sky (Whitehour, Kaldbak) would swallow the wordmark. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 180,
            display: "flex",
            background: "linear-gradient(180deg, rgba(9,14,10,0.6) 0%, rgba(9,14,10,0) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 64px 56px",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Display",
              fontSize: 36,
              color: INK.linen,
            }}
          >
            {SITE_NAME}
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {stay ? (
              <div
                style={{
                  fontFamily: "Mono",
                  fontSize: 18,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: INK.lichen,
                }}
              >
                {`${BIOME_LABEL[stay.biome]} · ${stay.region}, ${stay.country}`}
              </div>
            ) : null}
            <div
              style={{
                fontFamily: "Display",
                fontSize: 112,
                lineHeight: 1.02,
                color: INK.linen,
                letterSpacing: -1.5,
                marginTop: 8,
              }}
            >
              {stay?.name ?? SITE_NAME}
            </div>
            <div
              style={{
                display: "flex",
                gap: 28,
                marginTop: 26,
                paddingTop: 22,
                borderTop: "1px solid rgba(147,179,130,0.3)",
                fontFamily: "Mono",
                fontSize: 19,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: INK.haze,
              }}
            >
              {readings.map((r, i) => (
                <span key={r} style={{ color: i === 0 ? INK.ember : INK.haze }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
