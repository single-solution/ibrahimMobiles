/**
 * Cart line shape — denormalised so the cart drawer / checkout can render
 * without re-fetching every product. Server still re-validates pricing and
 * stock on order submission, so a stale snapshot is a UX issue, not a
 * security one.
 */

import type { ProductCategory } from "@store/shared";

export interface CartItem {
  /** Stable id used for React keys (`productId:variantId`). */
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  brandSlug: string;
  imageUrl: string;
  colorName: string;
  /** Price at time of add — re-validated server-side on order placement. */
  unitPriceRupees: number;
  category: ProductCategory;
  /** Slug used to build a link back to the product page. */
  productSlug: string;
  /** Storage in GB — only present for phones / some gadgets. */
  storageGb?: number;
  quantity: number;
}
