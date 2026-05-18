import type { Phone, Product, ProductCategory } from "@store/shared";

/**
 * Tiny, dependency-free helpers used across the storefront. Anything that
 * was previously **static category metadata** has moved to the `Category`
 * collection in MongoDB — load it via `getStorefrontCategoriesCached()` on
 * the server or `useCategories()` from `storefrontReferenceContext` on the
 * client so admin edits flow through automatically.
 *
 * What stays here:
 *   - Pure type guards (`isPhone`, `isAccessory`) — the `category` discriminant
 *     is fixed by the schema enum, so these don't need to ask the DB.
 *   - `productHref` — the canonical `/shop/<segment>/<slug>` URL builder.
 *     The default segment mapping (`phone → phones`, etc.) mirrors the
 *     reference docs seeded by `ensureReferenceData()` and matches every
 *     storefront route file (`/shop/[category]/...`). For runtime-aware
 *     hrefs that respect an admin-edited `pathSegment`, client components
 *     should use `useProductHref(...)` instead.
 */

const DEFAULT_CATEGORY_SEGMENT: Record<ProductCategory, string> = {
  phone: "phones",
  accessory: "accessories",
  gadget: "gadgets",
};

/**
 * Sync `/shop/<segment>/<slug>` builder for server contexts (RSC pages, sitemap,
 * canonical metadata) where we don't want to pay a DB round-trip just to
 * build a link. Returns the canonical URL using the default segment mapping
 * — which is identical to the segments seeded into the `Category` collection
 * by `ensureReferenceData()`. If an admin renames a `pathSegment` and a
 * client component needs to reflect that immediately, it should use
 * `useProductHref(product)` from `storefrontReferenceContext` instead.
 */
export function productHref(
  product: Product | { category: ProductCategory; slug: string },
): string {
  const segment = DEFAULT_CATEGORY_SEGMENT[product.category];
  return `/shop/${segment}/${product.slug}`;
}

/** Narrow a `Product` to `Phone` — used by ProductCard's spec block. */
export function isPhone(product: Product): product is Phone {
  return product.category === "phone";
}

/** Narrow a `Product` to an accessory — used by ProductCard's spec block. */
export function isAccessory(
  product: Product,
): product is Extract<Product, { category: "accessory" }> {
  return product.category === "accessory";
}
