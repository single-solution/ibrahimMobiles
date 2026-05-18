/**
 * Dynamic sitemap.
 *
 * We list:
 *   - Static marketing routes (home, deals, sell-to-us, etc.).
 *   - Each active category landing page.
 *   - Each active brand landing page (per category).
 *   - Each visible product page (capped to MAX_PRODUCT_URLS so a runaway DB
 *     doesn't blow the 50 k entry sitemap limit). When we eventually need
 *     more, split into per-category sitemaps via `generateSitemaps`.
 *
 * Cached by Next at the edge based on the page's revalidation policy.
 */
import type { MetadataRoute } from "next";

import { Brand, Product, connectDB, type CategoryId } from "@store/db";

import { getStorefrontBaseUrl } from "@/lib/storefront/baseUrl";
import { getStorefrontCategories } from "@/lib/storefront/queries";

// Regenerate the sitemap at most once an hour. Crawlers don't need
// instant freshness and a fully-dynamic regeneration on every request is
// expensive — it lists every product.
export const revalidate = 3600;

const MAX_PRODUCT_URLS = 5_000;

const STATIC_PATHS: ReadonlyArray<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/deals", changeFrequency: "daily", priority: 0.9 },
  { path: "/sell-to-us", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getStorefrontBaseUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((staticPath) => ({
    url: `${base}${staticPath.path}`,
    lastModified: now,
    changeFrequency: staticPath.changeFrequency,
    priority: staticPath.priority,
  }));

  await connectDB();

  const [categories, brands, products] = await Promise.all([
    getStorefrontCategories(),
    Brand.find({ isActive: true })
      .select({ slug: 1 })
      .lean<Array<{ slug: string }>>(),
    Product.find({ isActive: true, isArchived: { $ne: true } })
      .select({ slug: 1, category: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .limit(MAX_PRODUCT_URLS)
      .lean<Array<{ slug: string; category: CategoryId; updatedAt?: Date }>>(),
  ]);

  for (const category of categories) {
    if (!category.isActive) {
      continue;
    }
    entries.push({
      url: `${base}/shop/${category.pathSegment}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });
  }

  for (const brand of brands) {
    for (const category of categories) {
      if (!category.isActive) {
        continue;
      }
      entries.push({
        url: `${base}/shop/${category.pathSegment}?brand=${encodeURIComponent(brand.slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  const segmentByCategory = new Map<CategoryId, string>(
    categories.map((category) => [category.categoryId as CategoryId, category.pathSegment]),
  );
  for (const product of products) {
    const segment = segmentByCategory.get(product.category);
    if (!segment) {
      continue;
    }
    entries.push({
      url: `${base}/shop/${segment}/${product.slug}`,
      lastModified: product.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
