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
 */
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { getStoreSettings as getStoreSettingsRaw } from "@store/db";
import type { Phone, ProductCategory } from "@store/shared";

import {
  getStorefrontBrandBySlug as getStorefrontBrandBySlugRaw,
  getStorefrontBrands as getStorefrontBrandsRaw,
  getStorefrontCategories as getStorefrontCategoriesRaw,
  getStorefrontCategoryByPathSegment as getStorefrontCategoryByPathSegmentRaw,
  getStorefrontOffers as getStorefrontOffersRaw,
  getStorefrontProductBySlug as getStorefrontProductBySlugRaw,
  getStorefrontProductCountsByCategory as getStorefrontProductCountsByCategoryRaw,
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

export const getStoreSettingsCached = cache(getStoreSettingsRaw);

/** Per-render dedupe — `generateMetadata` and the page body both call this
 *  with the same `segment` on `/shop/[category]`. React `cache()` collapses
 *  the second call to a no-op for the same render pass. */
export const getStorefrontCategoryByPathSegmentCached = cache(
  getStorefrontCategoryByPathSegmentRaw,
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

export const getStorefrontBrandsCached = unstable_cache(
  () => getStorefrontBrandsRaw(),
  ["storefront-brands"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export const getStorefrontOffersCached = unstable_cache(
  () => getStorefrontOffersRaw(),
  ["storefront-offers"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

/**
 * Homepage hero gallery — newest phones, capped at `limit`. The limit
 * becomes part of the cache key so different callers (mobile vs desktop)
 * don't poison each other's cache entry.
 */
const getHeroPhonesCachedInner = unstable_cache(
  async (limit: number): Promise<Phone[]> => {
    const products = await getStorefrontProductsRaw({
      category: "phone",
      limit,
      sort: "release",
    });
    return products.filter((p): p is Phone => p.category === "phone");
  },
  ["storefront-hero-phones"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export function getHeroPhonesCached(limit: number): Promise<Phone[]> {
  return getHeroPhonesCachedInner(limit);
}

// `Map` doesn't survive JSON serialisation, so we cache the entries array and
// rehydrate at the call site. Two-line indirection, one network round-trip
// saved per shop visit.
const getStorefrontProductCountEntriesCached = unstable_cache(
  async (): Promise<[ProductCategory, number][]> => {
    const counts = await getStorefrontProductCountsByCategoryRaw();
    return Array.from(counts.entries());
  },
  ["storefront-product-counts"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

export async function getStorefrontProductCountsByCategoryCached(): Promise<
  Map<ProductCategory, number>
> {
  const entries = await getStorefrontProductCountEntriesCached();
  return new Map(entries);
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
  ["storefront-products-page"],
  { revalidate: STOREFRONT_CACHE_TTL_SECONDS, tags: [STOREFRONT_CACHE_TAG] },
);

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
