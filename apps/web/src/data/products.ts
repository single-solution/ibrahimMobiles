import type { Product } from "@store/shared";

/**
 * Tiny, dependency-free helpers used across the storefront. Anything that
 * was previously **static category metadata** has moved to the `Category`
 * collection in MongoDB — load it via `getStorefrontCategoriesCached()` on
 * the server or `useCategories()` from `storefrontReferenceContext` on the
 * client so admin edits flow through automatically.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Categories are now identified by `categorySlug` strings (admin-
 *     authored, no fixed enum). Type guards keyed on a hardcoded
 *     `category` discriminant are therefore gone — components must
 *     drive per-category UI off `Variant.attributes` (Phase 6) or off
 *     the resolved `Category` document loaded from context.
 *   - The URL contract is `/shop/<categorySlug>/<productSlug>` — the
 *     slug *is* the URL segment.
 */

/**
 * Sync `/shop/<categorySlug>/<slug>` builder for server contexts (RSC
 * pages, sitemap, canonical metadata) where we don't want to pay a DB
 * round-trip just to build a link. For client components, prefer
 * `useProductHref(product)` from `storefrontReferenceContext`.
 */
export function productHref(
  product: Pick<Product, "categorySlug" | "slug">,
): string {
  return `/shop/${product.categorySlug}/${product.slug}`;
}
