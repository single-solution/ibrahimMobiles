/**
 * Cart line shape — denormalised so the cart drawer / checkout can render
 * without re-fetching every product. Server still re-validates pricing and
 * stock on order submission, so a stale snapshot is a UX issue, not a
 * security one.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - Categories are admin-authored strings (`categorySlug`).
 *   - Hero image is a full `StoredImage` so the cart row can render the
 *     right resolution without falling back to `next/image` runtime
 *     optimisation.
 *   - Per-category typed fields (storage GB / connector / wattage) are
 *     gone — anything the cart needs to display about a variant beyond
 *     price + grade lives under the admin-defined `attributes` record.
 */

import type { StoredImage } from "@store/shared";

export interface CartItem {
  /** Stable id used for React keys (`productId:variantId`). */
  id: string;
  productId: string;
  variantId: string;
  /** Display name (`Product.name`). */
  productName: string;
  brandSlug: string;
  /** Brand display name — denormalised for the cart row. */
  brandName: string;
  /** Multi-resolution hero image. */
  image: StoredImage;
  /** Price at time of add — re-validated server-side on order placement. */
  unitPriceRupees: number;
  /** URL category segment (`Product.categorySlug`). */
  categorySlug: string;
  /** Slug used to build a link back to the product page. */
  productSlug: string;
  /** Variant grade slug — used to render the grade chip in the cart row. */
  gradeSlug: string;
  /** Variant selections keyed by `Attribute.slug` (e.g. `{ storage: "256GB", colour: "Titanium" }`). */
  attributes: Record<string, string | string[]>;
  quantity: number;
  /** Variant stock cap captured when the line was added. */
  maxQuantity?: number;
}
