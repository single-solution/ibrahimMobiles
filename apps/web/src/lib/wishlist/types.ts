import type { StoredImage } from "@store/shared";

/**
 * One saved item in the wishlist. Denormalised so we can render the
 * wishlist page without re-fetching every product.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Products are now identified by `(categorySlug, slug)` in URLs.
 *     `categorySlug` is an opaque string the wishlist stores so it can
 *     link back even if the user's locally-cached entry outlives a
 *     category rename.
 *   - The product's display name is `name`, not the legacy `modelName`.
 *   - Hero image is a full `StoredImage` (multi-resolution variants +
 *     blurhash) so the wishlist row can render the right size without
 *     re-fetching the product detail document.
 */
export interface WishlistItem {
  productId: string;
  productSlug: string;
  /** Display name (`Product.name`). Replaces the old `modelName`. */
  name: string;
  brandSlug: string;
  brandName: string;
  /** Multi-resolution hero image for the wishlist row. */
  image: StoredImage;
  /** URL category segment — matches `Product.categorySlug`. */
  categorySlug: string;
  /** Lowest variant price at the time of saving — refreshed when the user reopens detail. */
  fromPriceRupees: number;
  /** ISO timestamp. */
  savedAt: string;
}
