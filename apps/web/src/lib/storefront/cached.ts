/**
 * Storefront read caching, layered correctly.
 *
 * Two distinct cache tiers — both used here, doing different jobs:
 *
 *   1. React `cache()` — dedupes calls within a **single render**. If
 *      `generateMetadata` and the page body both ask for the same category
 *      lookup, only one underlying call happens.
 *
 *   2. Next.js `unstable_cache` — dedupes across **HTTP requests** for a
 *      given time window. Storefront reads are stable enough that a
 *      30-second window costs ~zero freshness but saves a Mongo round-trip
 *      on every visit. Tag-invalidate via `STOREFRONT_CACHE_TAG` from admin
 *      mutations when we need instant propagation.
 *
 * RSC pages / layouts / metadata generators must consume these wrappers
 * instead of the raw helpers, otherwise we leak work onto the hot path.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Categories are admin-authored and identified by `slug`. The legacy
 *     "path segment" lookup is replaced by `getStorefrontCategoryBySlug`.
 *   - Hero phones used to be a hardcoded `category === "phone"` filter.
 *     Phase 6 will replace this with an admin-flagged "homepage hero"
 *     category selector; for now, the hero strip surfaces the newest
 *     featured products across all categories.
 */
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { Brand, connectDB, getStoreSettings as getStoreSettingsRaw, Product } from "@store/db";
import type { Product as StorefrontProduct } from "@store/shared";

import {
  PUBLIC_PRODUCT_FILTER,
  getStorefrontBrandBySlug as getStorefrontBrandBySlugRaw,
  getStorefrontBrands as getStorefrontBrandsRaw,
  getStorefrontGradeCounts as getStorefrontGradeCountsRaw,
  getStorefrontAttributes as getStorefrontAttributesRaw,
  getStorefrontCategories as getStorefrontCategoriesRaw,
  getStorefrontCategoryBySlug as getStorefrontCategoryBySlugRaw,
  getStorefrontGrades as getStorefrontGradesRaw,
  getStorefrontOffers as getStorefrontOffersRaw,
  getStorefrontProductBySlug as getStorefrontProductBySlugRaw,
  getStorefrontProducts as getStorefrontProductsRaw,
  getStorefrontProductsPage as getStorefrontProductsPageRaw,
  hasAnyProducts as hasAnyProductsRaw,
  type StorefrontProductFilters,
  type StorefrontProductPage,
} from "@/lib/storefront/queries";

/** Tag for filter-independent storefront reads. Admin mutations that should
 *  surface immediately (product save, brand toggle, category reorder) can
 *  call `revalidateTag(STOREFRONT_CACHE_TAG)` to flush this layer. */
export const STOREFRONT_CACHE_TAG = "storefront";

/** Seconds the cross-request layer holds onto storefront reads. */
const STOREFRONT_CACHE_TTL_SECONDS = 30;

/* ─────────── per-render dedupe (React cache) ─────────── */

const loadStoreSettings = unstable_cache(
  () => getStoreSettingsRaw(),
  ["storefront-settings"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

/** Cross-request (30s) + per-render dedupe — settings power the root layout. */
export const getStoreSettingsCached = cache(loadStoreSettings);

/** Per-render dedupe — `generateMetadata` and the page body both call this
 *  with the same `slug` on `/shop/[category]`. */
export const getStorefrontCategoryBySlugCached = cache(
  getStorefrontCategoryBySlugRaw,
);

/** Per-render dedupe — `generateMetadata` and the page body on
 *  `/shop/[category]/[slug]` both look up the same product. */
export const getStorefrontProductBySlugCached = cache(
  getStorefrontProductBySlugRaw,
);

/** Per-render dedupe — the product detail page's metadata fetches the
 *  brand by slug, and the page body needs the same brand for the
 *  breadcrumb. One DB hit per render instead of two. */
export const getStorefrontBrandBySlugCached = cache(
  getStorefrontBrandBySlugRaw,
);

/* ─────────── cross-request dedupe (Next.js unstable_cache) ─────────── */

export const hasAnyProductsCached = unstable_cache(
  () => hasAnyProductsRaw(),
  ["storefront-has-any-products"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export const getStorefrontCategoriesCached = unstable_cache(
  () => getStorefrontCategoriesRaw(),
  ["storefront-categories"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

/**
 * Cached grade descriptors. Drives every `<GradeBadge>` / filter sidebar /
 * `<GradeShowcase>` instance on the storefront. Tagged with
 * `STOREFRONT_CACHE_TAG` so admin edits via `PUT /api/grades/:id` (which
 * calls `bustAdminCaches()` → `revalidateTag`) surface immediately.
 */
export const getStorefrontGradesCached = unstable_cache(
  () => getStorefrontGradesRaw(),
  ["storefront-grades"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export const getStorefrontAttributesCached = unstable_cache(
  () => getStorefrontAttributesRaw(),
  ["storefront-attributes"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export const getStorefrontBrandsCached = unstable_cache(
  (categorySlug?: string) => getStorefrontBrandsRaw(categorySlug),
  ["storefront-brands"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export const getStorefrontGradeCountsCached = unstable_cache(
  (categorySlug: string) => getStorefrontGradeCountsRaw(categorySlug),
  ["storefront-grade-counts"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export const getStorefrontOffersCached = unstable_cache(
  () => getStorefrontOffersRaw(),
  ["storefront-offers"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

/**
 * Homepage hero — the most recently updated in-stock products, optionally
 * narrowed to a chosen set of categories and/or grades chosen by the admin
 * in Settings → Homepage. Sorting by `updatedAt` (Mongoose timestamps)
 * means a restock bumps the SKU back into the hero without flipping any
 * curated flag.
 *
 * The cache key is a JSON envelope of every input so changing the admin's
 * picks (or the requested limit) carves a fresh entry instead of poisoning
 * the unfiltered result. Empty filter arrays mean "no narrowing".
 */
export interface HomeHeroFilters {
  categorySlugs?: string[];
  gradeSlugs?: string[];
}

const getHomeHeroProductsInner = unstable_cache(
  async (cacheKey: string): Promise<StorefrontProduct[]> => {
    const { limit, categorySlugs, gradeSlugs } = JSON.parse(cacheKey) as {
      limit: number;
      categorySlugs: string[];
      gradeSlugs: string[];
    };
    return getStorefrontProductsRaw({
      sort: "recently-updated",
      inStockOnly: true,
      limit,
      ...(categorySlugs.length > 0 ? { categorySlugs } : {}),
      ...(gradeSlugs.length > 0 ? { gradeSlugs } : {}),
    });
  },
  ["storefront-hero-products-v5"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export function getHomeHeroProductsCached(
  limit: number,
  filters: HomeHeroFilters = {},
): Promise<StorefrontProduct[]> {
  const categorySlugs = (filters.categorySlugs ?? []).slice().sort();
  const gradeSlugs = (filters.gradeSlugs ?? []).slice().sort();
  const cacheKey = JSON.stringify({ limit, categorySlugs, gradeSlugs });
  return getHomeHeroProductsInner(cacheKey);
}

/**
 * Cached `getStorefrontProductsPage` — the heavy aggregation that powers
 * `/shop/[category]`. We key by a canonical serialization of the filter
 * object so two identical requests (same category + same query string)
 * share a single Mongo round-trip within the 30s window.
 *
 * Note: the underlying aggregation is the same whether or not we wrap it
 * — the win is in **dropping the call entirely** for cached hits.
 */
const getStorefrontProductsPageInner = unstable_cache(
  async (cacheKey: string): Promise<StorefrontProductPage> => {
    const filters = JSON.parse(cacheKey) as StorefrontProductFilters;
    return getStorefrontProductsPageRaw(filters);
  },
  ["storefront-products-page-v2"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

const SITEMAP_PRODUCT_LIMIT = 5_000;

const loadSitemapProductsInner = unstable_cache(
  async () => {
    await connectDB();
    return Product.find(PUBLIC_PRODUCT_FILTER)
      .select({ slug: 1, categorySlug: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 })
      .limit(SITEMAP_PRODUCT_LIMIT)
      .lean<Array<{ slug: string; categorySlug: string; updatedAt?: Date }>>();
  },
  ["storefront-sitemap-products"],
  { revalidate: 3600, tags: [STOREFRONT_CACHE_TAG] },
);

export function getStorefrontSitemapProductsCached() {
  return loadSitemapProductsInner();
}

const loadSitemapBrandsInner = unstable_cache(
  async () => {
    await connectDB();
    return Brand.find({ isActive: true })
      .select({ slug: 1 })
      .lean<Array<{ slug: string }>>();
  },
  ["storefront-sitemap-brands"],
  { revalidate: 3600, tags: [STOREFRONT_CACHE_TAG] },
);

export function getStorefrontSitemapBrandsCached() {
  return loadSitemapBrandsInner();
}

export function getStorefrontProductsPageCached(
  filters: StorefrontProductFilters,
): Promise<StorefrontProductPage> {
  // Sort keys for a stable cache identity regardless of insertion order.
  const stable = Object.keys(filters)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      const value = (filters as Record<string, unknown>)[key];
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});
  return getStorefrontProductsPageInner(JSON.stringify(stable));
}
