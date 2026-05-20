import { FIELD_LIMITS } from "@store/shared";
import { Attribute, Grade, connectDB } from "@store/db";

/**
 * Hard upper bound on any rupee field. Even ultra-luxury phones top out
 * around Rs 1.2M; anything past 100M is definitionally an admin typo or
 * an attempted overflow attack.
 */
const MAX_RUPEE_AMOUNT = 100_000_000;
/** Default warranty months for variants where the admin didn't specify. */
const DEFAULT_WARRANTY_MONTHS = 6;
/** Hard upper bound on warranty months — we don't sell anything covered for
 *  more than 5 years, so bigger values are typos. */
const MAX_WARRANTY_MONTHS = 60;
/** Hard upper bound on variant quantity. Anything past 100k is a typo. */
const MAX_QUANTITY = 100_000;
/** Maximum images allowed per variant — mirrors the gallery UI cap. */
const MAX_VARIANT_IMAGES = 24;

export interface VariantInput {
  gradeSlug?: unknown;
  priceRupees?: unknown;
  quantity?: unknown;
  warrantyMonths?: unknown;
  images?: unknown;
  attributes?: unknown;
}

type VariantValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

interface ValidationContext {
  /** Required so grade + attribute validation can scope by category. */
  categorySlug: string;
}

/**
 * Quick shape-check for a `StoredImage`. The full pipeline (sharp resize,
 * blurhash, etc.) lands in Phase 2; this function only confirms the
 * payload coming back from the upload route has the universal shape so
 * we never persist a half-structured image.
 */
function isStoredImageShape(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.blurDataURL !== "string") return false;
  if (typeof v.width !== "number" || typeof v.height !== "number") return false;
  if (typeof v.alt !== "string") return false;
  const variants = v.variants;
  if (variants === null || typeof variants !== "object") return false;
  const vv = variants as Record<string, unknown>;
  return (
    typeof vv.thumb === "string" &&
    typeof vv.card === "string" &&
    typeof vv.detail === "string" &&
    typeof vv.full === "string"
  );
}

/**
 * Coerce + validate a variant payload against the per-category Grade
 * and Attribute collections. Asynchronous because the grade + attribute
 * lookups touch MongoDB; callers are already inside an `await connectDB()`
 * scope on every authoring path.
 *
 * Accepts partial input — caller decides which fields are required by
 * passing `requireAll`.
 */
export async function validateVariant(
  input: VariantInput,
  requireAll: boolean,
  context: ValidationContext,
): Promise<VariantValidationResult> {
  await connectDB();
  const value: Record<string, unknown> = {};

  // Grade — validated against Grade.find({ categorySlug }).
  if (input.gradeSlug !== undefined || requireAll) {
    if (typeof input.gradeSlug !== "string" || input.gradeSlug.length === 0) {
      return { ok: false, error: "Grade is required." };
    }
    const exists = await Grade.exists({
      categorySlug: context.categorySlug,
      slug: input.gradeSlug,
    });
    if (!exists) {
      return {
        ok: false,
        error: `Grade '${input.gradeSlug}' does not exist in category '${context.categorySlug}'.`,
      };
    }
    value.gradeSlug = input.gradeSlug;
  }

  if (input.priceRupees !== undefined || requireAll) {
    const price = Number(input.priceRupees);
    if (!Number.isFinite(price) || price < 0 || price > MAX_RUPEE_AMOUNT) {
      return { ok: false, error: "Price must be a non-negative number." };
    }
    value.priceRupees = price;
  }

  if (input.quantity !== undefined || requireAll) {
    const quantity = Number(input.quantity ?? 0);
    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > MAX_QUANTITY
    ) {
      return {
        ok: false,
        error: `Quantity must be a non-negative integer ≤ ${MAX_QUANTITY}.`,
      };
    }
    value.quantity = quantity;
  }

  if (input.warrantyMonths !== undefined) {
    const months = Number(input.warrantyMonths ?? DEFAULT_WARRANTY_MONTHS);
    if (!Number.isFinite(months) || months < 0 || months > MAX_WARRANTY_MONTHS) {
      return {
        ok: false,
        error: `Warranty months must be 0–${MAX_WARRANTY_MONTHS}.`,
      };
    }
    value.warrantyMonths = months;
  } else if (requireAll) {
    value.warrantyMonths = DEFAULT_WARRANTY_MONTHS;
  }

  // Images — required (≥1) when requireAll; each entry must be the
  // universal `StoredImage` shape produced by POST /api/uploads.
  if (input.images !== undefined || requireAll) {
    if (!Array.isArray(input.images) || input.images.length === 0) {
      return { ok: false, error: "At least one image is required." };
    }
    if (input.images.length > MAX_VARIANT_IMAGES) {
      return {
        ok: false,
        error: `A variant cannot have more than ${MAX_VARIANT_IMAGES} images.`,
      };
    }
    for (const image of input.images) {
      if (!isStoredImageShape(image)) {
        return {
          ok: false,
          error:
            "One or more images is not a valid StoredImage payload. Upload through /api/uploads.",
        };
      }
    }
    value.images = input.images;
  }

  // Dynamic per-category attribute map — keys = Attribute.slug, values =
  // a valid option value for that attribute.
  if (input.attributes !== undefined || requireAll) {
    const attributes = (input.attributes ?? {}) as unknown;
    if (
      attributes === null ||
      typeof attributes !== "object" ||
      Array.isArray(attributes)
    ) {
      return { ok: false, error: "Attributes must be an object map." };
    }
    const map = attributes as Record<string, unknown>;
    const validated: Record<string, string> = {};

    const defs = await Attribute.find({
      categorySlug: context.categorySlug,
      isActive: true,
    })
      .lean()
      .exec();
    const defsBySlug = new Map(defs.map((d) => [d.slug, d]));

    for (const [slug, raw] of Object.entries(map)) {
      const def = defsBySlug.get(slug);
      if (!def) {
        return {
          ok: false,
          error: `Unknown attribute '${slug}' for category '${context.categorySlug}'.`,
        };
      }
      if (typeof raw !== "string" || raw.length === 0) {
        return {
          ok: false,
          error: `Attribute '${slug}' must be a non-empty string value.`,
        };
      }
      const optionValues = new Set(def.options.map((o) => o.value));
      if (!optionValues.has(raw)) {
        return {
          ok: false,
          error: `Attribute '${slug}' = '${raw}' is not one of the allowed options for this category.`,
        };
      }
      validated[slug.slice(0, FIELD_LIMITS.shortLabel)] = raw;
    }

    value.attributes = validated;
  }

  return { ok: true, value };
}
