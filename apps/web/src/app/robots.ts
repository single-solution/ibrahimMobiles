/**
 * Public crawl policy for the storefront.
 *
 * `/account`, `/cart`, `/checkout`, `/track` all hold per-visitor state, so
 * crawlers gain nothing by indexing them and we burn their crawl budget.
 * The same goes for the API surface — never indexable, never relevant.
 */
import type { MetadataRoute } from "next";

import { getStorefrontBaseUrl } from "@/lib/storefront/baseUrl";

export default function robots(): MetadataRoute.Robots {
  const base = getStorefrontBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/cart", "/checkout", "/track", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
