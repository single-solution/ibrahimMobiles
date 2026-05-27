/**
 * Page-level data loaders.
 *
 * The homepage renders multiple independently-streaming sections via
 * Suspense, so we expose one loader per section instead of a single
 * bundled "everything the homepage needs" function. Each loader awaits
 * only the data its section actually consumes:
 *
 *   - Hero: featured products + brands → `getHomeHeroData`
 *   - Category tiles                   → `loadHomeCategoryTiles`
 *
 * Process and visit-store sections only need `getStoreSettingsCached`,
 * which they call directly.
 *
 * Why one loader per section, not one for the whole page? With a bundled
 * loader, every Suspense boundary that awaited it would have to wait for
 * the slowest read in the bundle, even sections that don't use that data.
 * Splitting means the brands-only section can light up the moment brands
 * lands, regardless of how long hero products takes.
 *
 * All reads still go through `cached.ts` — `unstable_cache` (30s TTL,
 * tagged) for cross-request dedupe so a hot homepage doesn't replay six
 * Mongo round-trips per visitor, and parallel `Promise.all` so two
 * lookups inside the same section don't serialize.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - The hero strip now supports featured products from any category
 *     since the legacy single-category carve-out is gone.
 *   - Category tiles surface only what the dynamic Category schema
 *     exposes (`slug`, `label`, `description`, `icon`). Per-category copy like "trustChips" lived on the
 *     old hardcoded shape and is no longer part of the data model;
 *     storefront landing pages compose their own copy from the
 *     description plus the category's grades/attributes.
 */

import { logger, parseCsvList } from "@store/shared";

import type { StorefrontCategory } from "@/lib/storefront";
import {
  getHomeHeroProductsCached,
  getStoreSettingsCached,
  getStorefrontBrandsCached,
  getStorefrontCategoriesCached,
} from "@/lib/storefront/cached";
import type {
  Brand as StorefrontBrand,
  Product as StorefrontProduct,
  StructuredContent,
} from "@store/shared";

/**
 * Cap and default for the hero fan. The admin can tune the live value in
 * Settings → Homepage; we clamp here as a defensive fallback for legacy
 * documents that pre-date the field.
 */
const HERO_PRODUCTS_DEFAULT_LIMIT = 12;
const HERO_PRODUCTS_MIN_LIMIT = 4;
const HERO_PRODUCTS_MAX_LIMIT = 24;

export interface HomeHeroData {
  /**
   * Latest in-stock products for the hero carousel, narrowed by the admin's
   * homepage settings (categories/grades) and capped at `homeHeroLimit`.
   */
  heroProducts: StorefrontProduct[];
  brands: StorefrontBrand[];
}

export interface HomePageCategory {
  /** Stable URL slug. */
  slug: string;
  label: string;
  description: string;
  icon: StorefrontCategory["icon"];
  isActive: boolean;
  sortOrder: number;
  /** Optional admin-authored structured copy (summary + bullet rows). */
  content?: StructuredContent;
}

/**
 * Hero-section data. Two parallel cached reads — the section unblocks
 * the instant the slower of the two lands, independent of every other
 * homepage section.
 *
 * Build-time resilience: if Mongo is unreachable (e.g. during a Vercel
 * build with a misconfigured Atlas allowlist), we return empty arrays
 * so the page still prerenders. ISR (`revalidate: 30`) means the first
 * request after deploy will retry the read and populate the cache, so
 * the degradation lasts at most one render cycle.
 */
export async function getHomeHeroData(): Promise<HomeHeroData> {
  try {
    const settings = await getStoreSettingsCached();
    const rawLimit =
      typeof settings.homeHeroLimit === "number" &&
      Number.isFinite(settings.homeHeroLimit)
        ? settings.homeHeroLimit
        : HERO_PRODUCTS_DEFAULT_LIMIT;
    const limit = Math.min(
      Math.max(Math.round(rawLimit), HERO_PRODUCTS_MIN_LIMIT),
      HERO_PRODUCTS_MAX_LIMIT,
    );
    const categorySlugs = parseCsvList(settings.homeHeroCategorySlugs);
    const gradeSlugs = parseCsvList(settings.homeHeroGradeSlugs);

    const [heroProducts, brands] = await Promise.all([
      getHomeHeroProductsCached(limit, { categorySlugs, gradeSlugs }),
      getStorefrontBrandsCached(),
    ]);
    return { heroProducts: heroProducts.slice(0, limit), brands };
  } catch (error) {
    logger.error(
      { error },
      "home: hero data load failed, falling back to empty hero this render",
    );
    return { heroProducts: [], brands: [] };
  }
}

/**
 * Shop-categories section data. Single cached read.
 *
 * Build-time resilience: same contract as `getHomeHeroData` — empty
 * array on read failure so the page still prerenders.
 */
export async function loadHomeCategoryTiles(): Promise<HomePageCategory[]> {
  try {
    const liveCategories = await getStorefrontCategoriesCached();
    return liveCategories
      .filter((category) => category.isActive)
      .map((category) => ({
        slug: category.slug,
        label: category.label,
        description: category.description,
        icon: category.icon,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        content: category.content,
      }));
  } catch (error) {
    logger.error(
      { error },
      "home: category tiles load failed, falling back to empty list this render",
    );
    return [];
  }
}
