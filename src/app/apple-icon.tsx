import { ImageResponse } from "next/og";

/* The home-screen icon: the same lone light as icon.svg, drawn at 180 px
   because iOS will not take an SVG here. */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#090e0a",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 28,
            right: 28,
            top: 112,
            height: 5,
            borderRadius: 3,
            background: "rgba(147,179,130,0.55)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 56,
            top: 50,
            width: 68,
            height: 68,
            borderRadius: 34,
            background: "rgba(233,168,94,0.16)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 72,
            top: 66,
            width: 36,
            height: 36,
            borderRadius: 18,
            background: "#e9a85e",
          }}
        />
      </div>
    ),
    size,
  );
}
