/**
 * Public storefront data layer.
 *
 * Pages and route handlers consume everything they need from this barrel
 * rather than reaching into `@/lib/core/queries` (or any model file)
 * directly — that keeps the public surface explicit and the implementation
 * details swappable.
 */

export {
  getBrands,
  getBrandBySlug,
  getProducts,
  getProductsPage,
  getProductBySlug,
  getProductsOnOffer,
  getOffers,
  getCategories,
  getCategoryMetaBySlug,
  getGrades,
  hasAnyProducts,
} from "@/lib/core/queries";

export { getFacets } from "@/lib/core/facets";
export { getSearchHints } from "@/lib/core/hints";
export type {
  AttributeFacet,
  FacetOption,
} from "@/lib/core/facets";

export type {
  CategoryMeta,
  ProductFilters,
  ProductPage,
  SortOption,
} from "@/lib/core/queries";

export {
  FILTER_PARAM_KEYS,
  parseFiltersFromSearchParams,
  buildSearchParamsFromFilters,
} from "@/lib/core/filterParams";
