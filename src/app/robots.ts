import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The route handlers are machinery, and /lab is a working folder that
      // must be gone before release — closed here in case it ever is not.
      disallow: ["/api/", "/lab/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
