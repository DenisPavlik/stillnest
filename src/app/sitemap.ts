import type { MetadataRoute } from "next";

import { allStaySlugs } from "@/lib/db/queries";
import { SITE_URL } from "@/lib/site";

/* Every page a person could land on from a search: the front door, the
   catalog, the philosophy, and each house. Catalog query strings are views
   of /stays, not pages of their own, so they are not listed. */

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await allStaySlugs();
  const now = new Date();

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/stays`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/philosophy`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/stays/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
