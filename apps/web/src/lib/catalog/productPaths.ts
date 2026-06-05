import type { Product, Variant } from "@store/shared";

import {
  GRADE_DIMENSION_KEY,
  resolveProductVariantFromSearch,
  selectionFromVariant,
} from "@/lib/catalog/pdpSelection";

/**
 * Build `/shop/<categorySlug>/<slug>` with human-readable configuration params
 * (`?grade=…&storage=…`) instead of opaque variant ids.
 */
export function productHref(
  product: Pick<Product, "categorySlug" | "slug">,
  options?: {
    selection?: Record<string, string>;
    variant?: Variant;
  },
): string {
  const base = `/shop/${product.categorySlug}/${product.slug}`;
  const selection =
    options?.selection ??
    (options?.variant ? selectionFromVariant(options.variant) : undefined);
  if (!selection || !hasSelectionValues(selection)) {
    return base;
  }
  const params = new URLSearchParams();
  const grade = selection[GRADE_DIMENSION_KEY];
  if (grade) {
    params.set("grade", grade);
  }
  for (const [key, value] of Object.entries(selection)) {
    if (key === GRADE_DIMENSION_KEY || !value) {
      continue;
    }
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function hasSelectionValues(selection: Record<string, string>): boolean {
  return Object.values(selection).some((value) => Boolean(value));
}

/**
 * Resolve the storefront entry URL to the first active category, in the same
 * catalog order the `/shop` route redirects to — so "Shop"/"Store" links skip
 * the `/shop` → first-category server redirect. Falls back to `/shop` when no
 * active category exists (the route then handles the edge case).
 */
export function shopHrefFromCategories(
  categories: ReadonlyArray<{ slug: string; isActive: boolean }>,
): string {
  const firstActive = categories.find((category) => category.isActive);
  return firstActive ? `/shop/${firstActive.slug}` : "/shop";
}

/** Absolute PDP URL for metadata, JSON-LD, and breadcrumbs. */
export function productAbsoluteUrl(
  siteUrl: string,
  product: Pick<Product, "categorySlug" | "slug">,
  options?: {
    selection?: Record<string, string>;
    variant?: Variant;
  },
): string {
  const path = productHref(product, options);
  const origin = siteUrl.replace(/\/$/, "");
  return `${origin}${path}`;
}
