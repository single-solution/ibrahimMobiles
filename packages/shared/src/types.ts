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

import type { ProductGradeImagesEntry } from "./catalog/gradeImages";
import type { SeoMeta } from "./seo/seoMeta";
import type { StoredImage } from "./storage/types";
import type { StructuredContent } from "./structuredContent";

// ============================================================================
// Brands
// ============================================================================

export interface Brand {
  slug: string;
  name: string;
  /** Number of in-stock products that reference this brand. */
  productCount: number;
  /** Optional admin SEO overrides (auto-filled when absent). */
  seo?: SeoMeta;
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
  /** Optional structured copy (summary + icon-tagged bullets). */
  content?: StructuredContent;
}

export interface AttributeOptionDescriptor {
  value: string;
  label: string;
  backgroundColor?: string;
}

export type AttributeCardPosition = "image-overlay" | "title-chips" | "none";

import type { AttributeVisibility } from "./attributeVisibility";

export type { AttributeVisibility, AttributeVisibilityType } from "./attributeVisibility";

export interface AttributeDescriptor {
  categorySlug: string;
  slug: string;
  label: string;
  /** Shared unit for all options (e.g. "gb"). */
  unit?: string;
  options: AttributeOptionDescriptor[];
  visibility?: AttributeVisibility;
  backgroundColor?: string;
  cardPosition: AttributeCardPosition;
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
  /** Warranty length in whole days (authoring + storefront). */
  warrantyDays?: number;
  /** @deprecated Read via {@link resolveWarrantyDays}; new data uses `warrantyDays`. */
  warrantyMonths?: number;
  /** Ordered gallery — index `0` is the hero. Derived from product `gradeImages`. */
  images: StoredImage[];
  /**
   * Per-attribute chosen option value. Keys are `Attribute.slug`
   * (scoped by the product's category); values are the option `value`
   * string. Render labels by joining against the Attribute collection.
   */
  attributes: Record<string, string | string[]>;
  /** Display labels for product-only custom attribute values (keyed by attribute slug). */
  attributeDisplay?: Record<string, string>;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  categorySlug: string;
  isFeatured: boolean;
  /** One gallery per grade; source of truth for PDP photos. */
  gradeImages?: ProductGradeImagesEntry[];
  variants: StorefrontVariant[];
  /** Optional admin SEO overrides (auto-filled when absent). */
  seo?: SeoMeta;
}

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
  /** Optional structured copy (summary + icon-tagged bullets). */
  content?: StructuredContent;
  /** Optional admin SEO overrides (auto-filled when absent). */
  seo?: SeoMeta;
}
