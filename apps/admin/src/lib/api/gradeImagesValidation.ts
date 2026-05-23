import {
  isStoredImage,
  MAX_GRADE_IMAGES,
  type ProductGradeImagesEntry,
  type StoredImage,
} from "@store/shared";
import { Grade, connectDB } from "@store/db";

function toStoredImagePayload(value: unknown): StoredImage | null {
  if (!isStoredImage(value)) return null;
  return {
    variants: {
      thumb: value.variants.thumb,
      card: value.variants.card,
      detail: value.variants.detail,
      full: value.variants.full,
    },
    blurDataURL: value.blurDataURL,
    width: value.width,
    height: value.height,
    alt: value.alt,
  };
}

export interface GradeImagesInput {
  gradeSlug?: unknown;
  images?: unknown;
}

type GradeImagesValidationResult =
  | { ok: true; value: ProductGradeImagesEntry[] }
  | { ok: false; error: string };

export interface ValidateGradeImagesOptions {
  /** When set, only these grades must include at least one photo. */
  requireImagesForGrades?: Set<string>;
}

export async function validateGradeImages(
  entries: GradeImagesInput[],
  categorySlug: string,
  options?: ValidateGradeImagesOptions,
): Promise<GradeImagesValidationResult> {
  await connectDB();
  const validated: ProductGradeImagesEntry[] = [];
  const seen = new Set<string>();
  const requireSet = options?.requireImagesForGrades;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (typeof entry.gradeSlug !== "string" || entry.gradeSlug.length === 0) {
      return { ok: false, error: `Grade gallery ${index + 1}: grade is required.` };
    }
    const gradeSlug = entry.gradeSlug.trim().toLowerCase();
    if (seen.has(gradeSlug)) {
      return {
        ok: false,
        error: `Duplicate photo gallery for grade '${gradeSlug}'.`,
      };
    }
    seen.add(gradeSlug);

    const exists = await Grade.exists({ categorySlug, slug: gradeSlug });
    if (!exists) {
      return {
        ok: false,
        error: `Grade '${gradeSlug}' does not exist in category '${categorySlug}'.`,
      };
    }

    const images = Array.isArray(entry.images) ? entry.images : [];
    const mustHaveImages =
      requireSet === undefined ? true : requireSet.has(gradeSlug);

    if (images.length === 0) {
      if (mustHaveImages) {
        return {
          ok: false,
          error: `Add at least one photo for grade '${gradeSlug}'.`,
        };
      }
      continue;
    }
    if (images.length > MAX_GRADE_IMAGES) {
      return {
        ok: false,
        error: `Grade '${gradeSlug}' cannot have more than ${MAX_GRADE_IMAGES} photos.`,
      };
    }
    const normalizedImages: StoredImage[] = [];
    for (const image of images) {
      const stored = toStoredImagePayload(image);
      if (!stored) {
        return {
          ok: false,
          error:
            "One or more images is not a valid StoredImage payload. Upload through /api/uploads.",
        };
      }
      normalizedImages.push(stored);
    }

    validated.push({
      gradeSlug,
      images: normalizedImages,
    });
  }

  return { ok: true, value: validated };
}
