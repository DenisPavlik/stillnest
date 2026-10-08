import { ImageResponse } from "next/og";

import { INK, OG_SIZE, exteriorDataUrl, ogFonts } from "@/lib/og";
import { SITE_NAME, TAGLINE } from "@/lib/site";

/* The preview every page without its own falls back to — the home page,
   the catalog, philosophy. The same house the home hero opens on. */

export const alt = `${SITE_NAME} — ${TAGLINE} Off-grid houses measured by how far they are from everyone else.`;
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const photo = await exteriorDataUrl("hollowmoss-04");

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
              "linear-gradient(90deg, rgba(9,14,10,0.92) 0%, rgba(9,14,10,0.62) 45%, rgba(9,14,10,0.05) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "64px 72px",
            width: "100%",
          }}
        >
          <div
            style={{
              fontFamily: "Display",
              fontSize: 132,
              lineHeight: 1,
              color: INK.linen,
              letterSpacing: -2,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontFamily: "Display",
              fontStyle: "italic",
              fontSize: 52,
              color: INK.linen,
              marginTop: 10,
              opacity: 0.9,
            }}
          >
            {TAGLINE}
          </div>
          <div
            style={{
              fontFamily: "Mono",
              fontSize: 19,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: INK.lichen,
              marginTop: 40,
              maxWidth: 640,
              lineHeight: 1.6,
            }}
          >
            Twelve off-grid houses, measured by how far they are from everyone else
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
