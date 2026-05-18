/**
 * Page-level data loaders.
 *
 * The homepage renders five independently-streaming sections via Suspense,
 * so we expose one loader per section instead of a single bundled
 * "everything the homepage needs" function. Each loader awaits only the
 * data its section actually consumes:
 *
 *   - Hero: hero phones + brands         → `getHomeHeroData`
 *   - Shop types: categories + counts    → `getHomeShopTypesData`
 *
 * Process and visit-store sections only need `getStoreSettingsCached`,
 * which they call directly.
 *
 * Why one loader per section, not one for the whole page? With a bundled
 * loader, every Suspense boundary that awaited it would have to wait for
 * the slowest read in the bundle (e.g. hero phones), even sections that
 * don't use that data. Splitting means the brands-only section can light
 * up the moment brands lands, regardless of how long hero-phones takes.
 *
 * All reads still go through `cached.ts` — `unstable_cache` (30s TTL,
 * tagged) for cross-request dedupe so a hot homepage doesn't replay six
 * Mongo round-trips per visitor, and parallel `Promise.all` so two
 * lookups inside the same section don't serialize.
 */

import { logger } from "@store/shared";

import { type StorefrontCategory } from "@/lib/storefront";
import {
  getHeroPhonesCached,
  getStorefrontBrandsCached,
  getStorefrontCategoriesCached,
  getStorefrontProductCountsByCategoryCached,
} from "@/lib/storefront/cached";
import type {
  Brand as StorefrontBrand,
  Phone,
  ProductCategory,
} from "@store/shared";

/** Phones surfaced in the homepage hero gallery. */
const HERO_PHONES_LIMIT = 5;

export interface HomeHeroData {
  /** Most-recent phones for the hero gallery, capped at `HERO_PHONES_LIMIT`. */
  heroPhones: Phone[];
  brands: StorefrontBrand[];
}

export interface HomePageCategory {
  id: ProductCategory;
  label: string;
  pluralLabel: string;
  pathSegment: string;
  isActive: boolean;
  tagline: string;
  applicableGrades: StorefrontCategory["applicableGrades"];
  trustChips: string[];
  emptyHint: string;
  /** Live count of products available in this category. */
  itemCount: number;
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
    const [recentPhones, brands] = await Promise.all([
      getHeroPhonesCached(HERO_PHONES_LIMIT),
      getStorefrontBrandsCached(),
    ]);

    const heroPhones = recentPhones
      .filter((product): product is Phone => product.category === "phone")
      .slice(0, HERO_PHONES_LIMIT);

    return { heroPhones, brands };
  } catch (error) {
    logger.error(
      { error },
      "home: hero data load failed, falling back to empty hero this render",
    );
    return { heroPhones: [], brands: [] };
  }
}

/**
 * Shop-types section data. Two parallel cached reads, then a cheap
 * in-memory join. Independent of every other homepage section.
 *
 * Build-time resilience: same contract as `getHomeHeroData` — empty
 * array on read failure so the page still prerenders.
 */
export async function getHomeShopTypesData(): Promise<HomePageCategory[]> {
  try {
    const [liveCategories, countsByCategory] = await Promise.all([
      getStorefrontCategoriesCached(),
      getStorefrontProductCountsByCategoryCached(),
    ]);

    return liveCategories.map((category) => ({
      id: category.id,
      label: category.label,
      pluralLabel: category.pluralLabel,
      pathSegment: category.pathSegment,
      isActive: category.isActive,
      tagline: category.tagline,
      applicableGrades: category.applicableGrades,
      trustChips: category.trustChips,
      emptyHint: category.emptyHint,
      itemCount: countsByCategory.get(category.id) ?? 0,
    }));
  } catch (error) {
    logger.error(
      { error },
      "home: shop-types data load failed, falling back to empty list this render",
    );
    return [];
  }
}
