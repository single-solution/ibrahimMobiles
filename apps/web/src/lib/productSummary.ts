/**
 * Pure, dependency-free helpers that derive display-time values
 * (default variant, in-stock flag) from a hydrated storefront `Product`.
 * They never touch the database, never import any model, and never read
 * from `src/data/*` — safe for both server and client bundles.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Grades are dynamic per category, so the old hardcoded `GRADE_RANK`
 *     is gone. Default variant selection now uses a single, universal
 *     heuristic: cheapest in-stock first, falling back to cheapest
 *     overall when the product is fully out of stock.
 *   - Stock is the variant's `quantity > 0` (no separate `isInStock`).
 *   - There is no `originalPriceRupees` on a variant anymore, so the
 *     old "has any offer" helper is removed — offers are decoupled from
 *     individual variants and live on the `Offer` collection.
 */

import type { Product, StorefrontVariant } from "@store/shared";

const isVariantInStock = (variant: StorefrontVariant): boolean =>
  (variant.quantity ?? 0) > 0;

/**
 * Sensible "starting" variant for any product. Picks the cheapest in-stock
 * variant; falls back to the overall cheapest when nothing is in stock.
 * Stable across renders because we always pick from a deterministic order
 * (price asc, ties broken by id) — no flicker when re-fetching.
 */
export function getDefaultVariant(product: Product): StorefrontVariant {
  const variants = product.variants;
  if (variants.length === 0) {
    throw new Error(
      `Product "${product.slug}" has no variants — refusing to pick a default.`,
    );
  }
  const inStock = variants.filter(isVariantInStock);
  const pool = inStock.length > 0 ? inStock : variants;
  return [...pool].sort((a, b) => {
    const priceDelta = a.priceRupees - b.priceRupees;
    if (priceDelta !== 0) {
      return priceDelta;
    }
    return a.id.localeCompare(b.id);
  })[0];
}

export function isProductInStock(product: Product): boolean {
  return product.variants.some(isVariantInStock);
}
