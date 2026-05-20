/**
 * Dynamic sitemap.
 *
 * We list:
 *   - Static marketing routes (home, deals, sell-to-us, etc.).
 *   - Each active category landing page.
 *   - Each active brand landing page (per category, as a query param).
 *   - Each visible product page (capped to MAX_PRODUCT_URLS so a runaway DB
 *     doesn't blow the 50 k entry sitemap limit). When we eventually need
 *     more, split into per-category sitemaps via `generateSitemaps`.
 *
 * Cached by Next at the edge based on the page's revalidation policy.
 *
 * Build-time resilience: the dynamic portion (categories/brands/products)
 * is wrapped in a single try/catch so that if Mongo is unreachable during
 * `next build` — typical on Vercel when Atlas blocks the build sandbox's
 * IP — we still emit a valid sitemap containing the static marketing URLs
 * instead of failing the entire build. The first runtime revalidation
 * (≤ 1h later) will populate the full sitemap.
 */
import type { MetadataRoute } from "next";

import { Brand, Product, connectDB } from "@store/db";
import { logger } from "@store/shared";

import { getStorefrontBaseUrl } from "@/lib/storefront/baseUrl";
import { getStorefrontCategories } from "@/lib/storefront/queries";

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

interface DynamicSitemapData {
  categories: Awaited<ReturnType<typeof getStorefrontCategories>>;
  brands: Array<{ slug: string }>;
  products: Array<{ slug: string; categorySlug: string; updatedAt?: Date }>;
}

async function loadDynamicData(): Promise<DynamicSitemapData | null> {
  try {
    await connectDB();
    const [categories, brands, products] = await Promise.all([
      getStorefrontCategories(),
      Brand.find({ isActive: true })
        .select({ slug: 1 })
        .lean<Array<{ slug: string }>>(),
      Product.find({ isActive: true, isArchived: { $ne: true } })
        .select({ slug: 1, categorySlug: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 })
        .limit(MAX_PRODUCT_URLS)
        .lean<Array<{ slug: string; categorySlug: string; updatedAt?: Date }>>(),
    ]);
    return { categories, brands, products };
  } catch (error) {
    logger.error(
      { error },
      "sitemap: dynamic load failed, emitting static-only sitemap this generation",
    );
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getStorefrontBaseUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((staticPath) => ({
    url: `${base}${staticPath.path}`,
    lastModified: now,
    changeFrequency: staticPath.changeFrequency,
    priority: staticPath.priority,
  }));

  const data = await loadDynamicData();
  if (!data) {
    return entries;
  }

  const { categories, brands, products } = data;
  const activeCategorySlugs = new Set(
    categories.filter((c) => c.isActive).map((c) => c.slug),
  );

  for (const category of categories) {
    if (!category.isActive) {
      continue;
    }
    entries.push({
      url: `${base}/shop/${category.slug}`,
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
        url: `${base}/shop/${category.slug}?brand=${encodeURIComponent(brand.slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const product of products) {
    if (!activeCategorySlugs.has(product.categorySlug)) {
      continue;
    }
    entries.push({
      url: `${base}/shop/${product.categorySlug}/${product.slug}`,
      lastModified: product.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
