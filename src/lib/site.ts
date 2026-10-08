import type { Metadata } from "next";

/**
 * Where the site lives, said once.
 *
 * Only `main` deploys, so Vercel's production URL is the one address the site
 * ever has; locally it is the dev server. Everything that has to be absolute —
 * `metadataBase`, the sitemap, robots, OG image URLs — reads this, and nothing
 * else spells the domain.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const SITE_NAME = "Stillnest";
export const TAGLINE = "Nowhere. On purpose.";

/**
 * One page's metadata, complete: title, description, its canonical address,
 * and the Open Graph and X cards built from the same two strings.
 *
 * Page-level `openGraph` replaces the layout's rather than merging into it, so
 * a page that set only a title would ship a card with no site name — hence one
 * function that always sets the lot. The preview image is not here: it comes
 * from the nearest `opengraph-image` file, which Next adds on its own.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
