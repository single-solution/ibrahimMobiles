/**
 * Product image resolution helpers.
 *
 * The persisted source of truth is `Product.images` (a flat gallery
 * applied to every variant). Two legacy fallbacks exist for backwards
 * compatibility so documents that haven't been re-saved since the
 * grade-galleries era keep showing photos:
 *
 *  1. `Product.gradeImages[]` — one ordered gallery per grade slug.
 *  2. `variant.images[]` — pre-`gradeImages` data, one gallery per variant.
 *
 * The resolver below collapses both fallbacks into the same flat shape
 * the modern field already provides.
 */

import type { StoredImage } from "../storage/types";

/** @deprecated Per-grade gallery shape. Reads only — new code writes
 *  `Product.images` directly. Kept so we can still parse documents that
 *  haven't been migrated. */
export interface ProductGradeImagesEntry {
  gradeSlug: string;
  images: StoredImage[];
}

export const MAX_PRODUCT_IMAGES = 24;
/** @deprecated Same limit, exported under its historical name for callers
 *  that haven't been renamed yet. */
export const MAX_GRADE_IMAGES = MAX_PRODUCT_IMAGES;

interface LegacyGradeImagesSource {
  gradeSlug: string;
  images?: StoredImage[];
}

interface LegacyVariantImagesSource {
  images?: StoredImage[];
}

interface ResolveProductImagesInput {
  /** Modern: persisted product-level gallery. */
  images?: StoredImage[];
  /** Legacy: per-grade galleries. */
  gradeImages?: LegacyGradeImagesSource[];
  /** Legacy: per-variant galleries (pre-`gradeImages`). */
  variants?: LegacyVariantImagesSource[];
}

/**
 * Return the canonical product gallery, falling back to legacy fields when
 * the modern `images` array is missing or empty. Result is a stable
 * `StoredImage[]` — order preserved from the source it picked.
 */
export function resolveProductImages(input: ResolveProductImagesInput): StoredImage[] {
  if (input.images?.length) {
    return input.images.filter(Boolean);
  }

  if (input.gradeImages?.length) {
    for (const entry of input.gradeImages) {
      const images = entry.images?.filter(Boolean) ?? [];
      if (images.length) {
        return images;
      }
    }
  }

  if (input.variants?.length) {
    for (const variant of input.variants) {
      const images = variant.images?.filter(Boolean) ?? [];
      if (images.length) {
        return images;
      }
    }
  }

  return [];
}
