import type { StoredImage } from "../storage/types";

/** One gallery per product grade (condition). */
export interface ProductGradeImagesEntry {
  gradeSlug: string;
  images: StoredImage[];
}

export const MAX_GRADE_IMAGES = 24;

type GradeImageSource = { gradeSlug: string; images?: StoredImage[] };

export function normalizeGradeSlug(gradeSlug: string): string {
  return gradeSlug.trim().toLowerCase();
}

/** Resolve grade → gallery, preferring persisted `gradeImages` over legacy variant rows. */
export function buildGradeImagesMap(
  gradeImages: ProductGradeImagesEntry[] | undefined,
  legacyVariants?: GradeImageSource[],
): Map<string, StoredImage[]> {
  const map = new Map<string, StoredImage[]>();

  if (gradeImages?.length) {
    for (const entry of gradeImages) {
      const slug = normalizeGradeSlug(entry.gradeSlug);
      if (!slug || !entry.images?.length || map.has(slug)) continue;
      map.set(slug, entry.images);
    }
    if (map.size > 0) {
      return map;
    }
  }

  if (legacyVariants) {
    for (const variant of legacyVariants) {
      const slug = normalizeGradeSlug(variant.gradeSlug);
      if (!slug || map.has(slug)) continue;
      const images = variant.images?.filter(Boolean);
      if (images?.length) map.set(slug, images);
    }
  }

  return map;
}

export function imagesForProductGrade(
  gradeSlug: string,
  gradeImages: ProductGradeImagesEntry[] | undefined,
  legacyVariants?: GradeImageSource[],
): StoredImage[] {
  const normalized = normalizeGradeSlug(gradeSlug);
  return buildGradeImagesMap(gradeImages, legacyVariants).get(normalized) ?? [];
}

export function deriveGradeImagesFromVariants(
  variants: GradeImageSource[],
): ProductGradeImagesEntry[] {
  return [...buildGradeImagesMap(undefined, variants).entries()].map(
    ([gradeSlug, images]) => ({ gradeSlug, images }),
  );
}

export function normalizedProductGradeImages(
  gradeImages: ProductGradeImagesEntry[] | undefined,
  legacyVariants?: GradeImageSource[],
): ProductGradeImagesEntry[] {
  const map = buildGradeImagesMap(gradeImages, legacyVariants);
  return [...map.entries()].map(([gradeSlug, images]) => ({ gradeSlug, images }));
}
