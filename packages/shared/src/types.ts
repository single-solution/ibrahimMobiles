/**
 * Public storefront types.
 *
 * After Phase 1 (PLAN.md §10) the catalog is fully admin-authored and
 * dynamic — categories, brands, grades, and attributes are no longer
 * baked into the type system. Every entity is identified by `slug`
 * (the URL-safe key), and per-category metadata lives in MongoDB.
 *
 * Consumers should treat `categorySlug`, `gradeSlug`, and attribute
 * keys as opaque strings; render labels by joining against the
 * reference collections loaded through `storefrontReferenceContext`.
 */

import type { StoredImage } from "./storage/types";

// ============================================================================
// Brands
// ============================================================================

export interface Brand {
  slug: string;
  name: string;
  /** Number of in-stock products that reference this brand. */
  productCount: number;
}

// ============================================================================
// Grades
// ============================================================================

/**
 * Per-category grade descriptor (Grade collection lean shape, projected
 * down to the storefront surface). `notes` is the combined cosmetic +
 * functional description; `color` is a hex string for swatches.
 */
export interface GradeDescriptor {
  /** Owning category (matches `Product.categorySlug` of the products that use it). */
  categorySlug: string;
  /** URL-safe grade identifier. Matches `Variant.gradeSlug`. */
  slug: string;
  label: string;
  notes: string;
  color: string;
  /** Optional inspection video URL (Vercel Blob). */
  video?: string;
}

// ============================================================================
// Variants & products
// ============================================================================

export interface StorefrontVariant {
  id: string;
  /** Matches a `Grade.slug` scoped by the product's `categorySlug`. */
  gradeSlug: string;
  priceRupees: number;
  /** Current in-stock count. `>0` is "available". */
  quantity: number;
  warrantyMonths?: number;
  /** Ordered gallery — index `0` is the hero. */
  images: StoredImage[];
  /**
   * Per-attribute chosen option value. Keys are `Attribute.slug`
   * (scoped by the product's category); values are the option `value`
   * string. Render labels by joining against the Attribute collection.
   */
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  categorySlug: string;
  isFeatured: boolean;
  variants: StorefrontVariant[];
}

/** Loose alias used by cart lines, order items, and similar carriers. */
export type AnyVariant = StorefrontVariant;

// ============================================================================
// Offers
// ============================================================================

export interface Offer {
  id: string;
  slug: string;
  title: string;
  description: string;
  discountLabel: string;
  expiresAt: string;
  /** Accent color — hex (`#RRGGBB`) authored in the admin offer drawer. */
  color: string;
  badgeLabel: string;
  bannerImage?: StoredImage;
}
