import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The link previews read the site's fonts and each house's exterior off
     disk (src/lib/og.tsx). Name them, so the trace cannot miss them, and keep
     the loops and sound beds that live beside those stills out of every
     server bundle — they are served statically, and 48 MB of video inside a
     function is a cold start nobody asked for. */
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/*.ttf", "./public/stays/*/exterior-1536.jpg"],
    "/stays/*/opengraph-image": ["./assets/fonts/*.ttf", "./public/stays/*/exterior-1536.jpg"],
  },
  outputFileTracingExcludes: {
    "/*": ["./public/stays/**/*.{mp4,webm,mp3}", "./public/lab/**/*"],
  },
};

export default nextConfig;
