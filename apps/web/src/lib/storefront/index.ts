/**
 * Public storefront data layer.
 *
 * Pages and route handlers consume everything they need from this barrel
 * rather than reaching into `@/lib/storefront/queries` (or any model file)
 * directly — that keeps the public surface explicit and the implementation
 * details swappable.
 */

export {
  getStorefrontBrands,
  getStorefrontBrandBySlug,
  getStorefrontProducts,
  getStorefrontProductsPage,
  getStorefrontProductBySlug,
  getStorefrontProductsOnOffer,
  getStorefrontProductCountsByCategory,
  getStorefrontOffers,
  getStorefrontCategories,
  getStorefrontCategoryByPathSegment,
  hasAnyProducts,
} from "@/lib/storefront/queries";

export type {
  StorefrontCategory,
  StorefrontProductFilters,
  StorefrontProductPage,
  StorefrontSort,
} from "@/lib/storefront/queries";

export {
  FILTER_PARAM_KEYS,
  parseFiltersFromSearchParams,
  buildSearchParamsFromFilters,
} from "@/lib/storefront/filterParams";
