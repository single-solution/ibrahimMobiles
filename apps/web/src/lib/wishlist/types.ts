import type { ProductCategory } from "@store/shared";

/**
 * One saved item in the wishlist. Denormalised so we can render the
 * wishlist page without re-fetching every product.
 */
export interface WishlistItem {
  productId: string;
  productSlug: string;
  modelName: string;
  brandSlug: string;
  brandName: string;
  imageUrl: string;
  category: ProductCategory;
  /** Lowest variant price at the time of saving — refreshed when the user reopens detail. */
  fromPriceRupees: number;
  /** ISO timestamp. */
  savedAt: string;
}
