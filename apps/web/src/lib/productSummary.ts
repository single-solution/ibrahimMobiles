/**
 * Pure, dependency-free helpers that derive display-time values
 * (default variant, in-stock flag) from a hydrated storefront `Product`.
 * They never touch the database, never import any model, and never read
 * from `src/data/*` — safe for both server and client bundles.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Grades are dynamic per category, so the old hardcoded `GRADE_RANK`
 *     is gone. Default variant selection now uses one product-card
 *     heuristic: cheapest in-stock first, falling back to cheapest
 *     overall when the product is fully out of stock.
 *   - Stock is the variant's `quantity > 0` (no separate `isInStock`).
 *   - There is no `originalPriceRupees` on a variant anymore, so the
 *     old "has any offer" helper is removed — offers are decoupled from
 *     individual variants and live on the `Offer` collection.
 */

import type { GradeDescriptor, Product, StoredImage, StorefrontVariant } from "@store/shared";
import { formatPrice, imagesForProductGrade } from "@store/shared";

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
    return {
      id: "",
      gradeSlug: "",
      priceRupees: 0,
      quantity: 0,
      warrantyDays: 0,
      images: [],
      attributes: {},
    };
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

/** Distinct grade slugs across a product's variants (for shop card chips). */
export function countProductGrades(product: Product): number {
  const gradeSlugs = new Set<string>();
  for (const variant of product.variants) {
    if (variant.gradeSlug) {
      gradeSlugs.add(variant.gradeSlug);
    }
  }
  return gradeSlugs.size;
}

export interface ProductListingStats {
  gradeCount: number;
  variantCount: number;
}

export function getProductListingStats(product: Product): ProductListingStats {
  return {
    gradeCount: countProductGrades(product),
    variantCount: product.variants.length,
  };
}

export interface ProductPriceRange {
  min: number;
  max: number;
}

/** Min/max variant prices on a product (in-stock not required). */
export function getProductPriceRange(product: Product): ProductPriceRange | null {
  const prices = product.variants
    .map((variant) => variant.priceRupees)
    .filter((price) => price > 0);
  if (prices.length === 0) {
    return null;
  }
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}

export function formatProductPriceRange(range: ProductPriceRange): string {
  if (range.min === range.max) {
    return formatPrice(range.min);
  }
  return `${formatPrice(range.min)} – ${formatPrice(range.max)}`;
}

/** Hero image for a variant — prefers serialized `variant.images`, falls back to grade gallery. */
export function resolveVariantHeroImage(
  product: Product,
  variant: StorefrontVariant,
): StoredImage | undefined {
  return (
    variant.images?.[0] ??
    imagesForProductGrade(variant.gradeSlug, product.gradeImages, product.variants)[0]
  );
}

/**
 * Variant to link from shop cards — honours a single active grade filter;
 * grade-expanded grids pass a product scoped to one grade.
 */
export function resolveListingVariant(
  product: Product,
  options?: { gradeSlugs?: string[] },
): StorefrontVariant {
  const gradeSlugs = options?.gradeSlugs?.filter(Boolean) ?? [];
  if (gradeSlugs.length === 1) {
    const matches = product.variants.filter((row) => row.gradeSlug === gradeSlugs[0]);
    if (matches.length > 0) {
      const inStock = matches.filter(isVariantInStock);
      const pool = inStock.length > 0 ? inStock : matches;
      return [...pool].sort((left, right) => {
        const priceDelta = left.priceRupees - right.priceRupees;
        if (priceDelta !== 0) {
          return priceDelta;
        }
        return left.id.localeCompare(right.id);
      })[0];
    }
  }
  if (product.variants.length === 1) {
    return product.variants[0];
  }
  return getDefaultVariant(product);
}

/** Variants in stable card order — cheapest in-stock first, then by id. */
export function getVariantsInDisplayOrder(
  variants: StorefrontVariant[],
): StorefrontVariant[] {
  const inStock = variants.filter(isVariantInStock);
  const pool = inStock.length > 0 ? inStock : variants;
  return [...pool].sort((left, right) => {
    const priceDelta = left.priceRupees - right.priceRupees;
    if (priceDelta !== 0) {
      return priceDelta;
    }
    return left.id.localeCompare(right.id);
  });
}

/**
 * Grade slugs present on a product, ordered like the PDP grade selector
 * (category grade list first, unknown slugs appended).
 */
export function getProductGradesInDisplayOrder(
  product: Product,
  categoryGrades: GradeDescriptor[],
): string[] {
  const usedSlugs = new Set<string>();
  for (const variant of product.variants) {
    if (variant.gradeSlug) {
      usedSlugs.add(variant.gradeSlug);
    }
  }
  if (usedSlugs.size === 0) {
    return [];
  }

  const ordered: string[] = [];
  const knownSlugs = new Set<string>();
  for (const grade of categoryGrades) {
    if (!usedSlugs.has(grade.slug)) {
      continue;
    }
    ordered.push(grade.slug);
    knownSlugs.add(grade.slug);
  }
  for (const slug of usedSlugs) {
    if (!knownSlugs.has(slug)) {
      ordered.push(slug);
    }
  }
  return ordered;
}

/** Variants scoped to one grade — for card copy and attribute aggregation. */
export function scopeProductToGrade(product: Product, gradeSlug: string): Product {
  return {
    ...product,
    variants: product.variants.filter((variant) => variant.gradeSlug === gradeSlug),
  };
}

/** Hero for browse-by-grade cards — grade gallery only, not per-variant photos. */
export function resolveGradeListingHeroImage(
  product: Product,
  gradeSlug: string,
): StoredImage | undefined {
  return imagesForProductGrade(gradeSlug, product.gradeImages, product.variants)[0];
}
