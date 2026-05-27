import {
  ATTRIBUTE_OPTION_VALUE_MAX_LENGTH,
  FIELD_LIMITS,
  isVisibilitySatisfied,
  parseAttributeVisibility,
  WARRANTY_DAYS_PER_MONTH,
  type VisibilityContext,
} from "@store/shared";
import { Attribute, Grade, connectDB } from "@store/db";

/**
 * Hard upper bound on any rupee field. Even the most expensive items
 * we'd realistically stock are well under this ceiling; anything past
 * 100M is definitionally an admin typo or an attempted overflow attack.
 */
const MAX_RUPEE_AMOUNT = 100_000_000;

/** Default warranty when the admin didn't specify (6 months). */
const DEFAULT_WARRANTY_DAYS = 6 * WARRANTY_DAYS_PER_MONTH;
/** Hard upper bound — 5 years in days. */
const MAX_WARRANTY_DAYS = 60 * WARRANTY_DAYS_PER_MONTH;
/** Hard upper bound on variant quantity. Anything past 100k is a typo. */
const MAX_QUANTITY = 100_000;

export interface VariantInput {
  gradeSlug?: unknown;
  priceRupees?: unknown;
  quantity?: unknown;
  warrantyDays?: unknown;
  /** @deprecated Accepted for older clients; converted to days. */
  warrantyMonths?: unknown;
  images?: unknown;
  attributes?: unknown;
  attributeDisplay?: unknown;
}

type VariantValidationResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

interface ValidationContext {
  /** Required so grade + attribute validation can scope by category. */
  categorySlug: string;
  /** Product brand — used for brand-gated attribute visibility. */
  brandSlug?: string;
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

  if (input.warrantyDays !== undefined || input.warrantyMonths !== undefined) {
    let days: number;
    if (input.warrantyDays !== undefined) {
      days = Number(input.warrantyDays);
    } else {
      const months = Number(input.warrantyMonths ?? 6);
      days = Math.floor(months) * WARRANTY_DAYS_PER_MONTH;
    }
    if (!Number.isFinite(days) || days < 0 || days > MAX_WARRANTY_DAYS) {
      return {
        ok: false,
        error: `Warranty must be 0–${MAX_WARRANTY_DAYS} days.`,
      };
    }
    if (!Number.isInteger(days)) {
      return {
        ok: false,
        error: "Warranty days must be a whole number.",
      };
    }
    value.warrantyDays = days;
  } else if (requireAll) {
    value.warrantyDays = DEFAULT_WARRANTY_DAYS;
  }

  // Images live on `product.images` — refuse any per-variant gallery payload.
  if (input.images !== undefined) {
    if (
      input.images !== null &&
      (!Array.isArray(input.images) || input.images.length > 0)
    ) {
      return {
        ok: false,
        error: "Variant photos aren't supported — manage product photos on the product.",
      };
    }
  }

  // Dynamic per-category attribute map — keys = Attribute.slug; values may
  // be global options or product-only custom slugs (with attributeDisplay).
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

    let displayMap: Record<string, unknown> = {};
    if (input.attributeDisplay !== undefined) {
      const rawDisplay = input.attributeDisplay;
      if (
        rawDisplay === null ||
        typeof rawDisplay !== "object" ||
        Array.isArray(rawDisplay)
      ) {
        return { ok: false, error: "attributeDisplay must be an object map." };
      }
      displayMap = rawDisplay as Record<string, unknown>;
    }

    const validatedDisplay: Record<string, string> = {};

    const defs = await Attribute.find({
      categorySlug: context.categorySlug,
      isActive: true,
    })
      .lean()
      .exec();
    const defsBySlug = new Map(defs.map((d) => [d.slug, d]));

    const gradeSlug =
      typeof value.gradeSlug === "string"
        ? value.gradeSlug
        : typeof input.gradeSlug === "string"
          ? input.gradeSlug
          : undefined;

    const visibilityContext: VisibilityContext = {
      brandSlug: context.brandSlug?.trim().toLowerCase(),
      gradeSlug,
      attributes: Object.fromEntries(
        Object.entries(map).flatMap(([slug, raw]) => {
          if (typeof raw === "string" && raw.length > 0) {
            return [[slug, raw] as const];
          }
          if (Array.isArray(raw)) {
            const first = raw.find(
              (entry): entry is string =>
                typeof entry === "string" && entry.length > 0,
            );
            return first ? [[slug, first] as const] : [];
          }
          return [];
        }),
      ),
    };

    const validated: Record<string, string | string[]> = {};

    for (const [slug, raw] of Object.entries(map)) {
      const def = defsBySlug.get(slug);
      if (!def) {
        return {
          ok: false,
          error: `Unknown attribute '${slug}' for category '${context.categorySlug}'.`,
        };
      }

      const values: string[] = Array.isArray(raw)
        ? raw.filter(
            (entry): entry is string => typeof entry === "string" && entry.length > 0,
          )
        : typeof raw === "string" && raw.length > 0
          ? [raw]
          : [];

      if (values.length === 0) {
        return {
          ok: false,
          error: `Attribute '${slug}' must have at least one value.`,
        };
      }

      const visibility = parseAttributeVisibility(def.visibility);
      if (!isVisibilitySatisfied(visibility, visibilityContext)) {
        return {
          ok: false,
          error: `Attribute '${slug}' is not available for this variant context.`,
        };
      }

      const optionValues = new Set(def.options.map((o) => o.value));
      const normalizedSlug = slug.slice(0, FIELD_LIMITS.shortLabel);

      for (const value of values) {
        if (!optionValues.has(value)) {
          if (value.length > ATTRIBUTE_OPTION_VALUE_MAX_LENGTH) {
            return {
              ok: false,
              error: `Custom value slug for '${slug}' is too long.`,
            };
          }
          const displayRaw = displayMap[slug];
          const displayLabel =
            typeof displayRaw === "string" ? displayRaw.trim() : "";
          if (!displayLabel) {
            return {
              ok: false,
              error: `Custom value for '${slug}' requires a display label.`,
            };
          }
          validatedDisplay[normalizedSlug] = displayLabel.slice(
            0,
            FIELD_LIMITS.shortLabel,
          );
          break;
        }
      }

      validated[normalizedSlug] =
        values.length === 1 ? values[0] : values.map((value) => value);
    }

    value.attributes = validated;
    if (Object.keys(validatedDisplay).length > 0) {
      value.attributeDisplay = validatedDisplay;
    } else if (input.attributeDisplay !== undefined) {
      value.attributeDisplay = {};
    }
  }

  return { ok: true, value };
}

export async function validateVariantsBatch(
  variants: VariantInput[],
  requireAll: boolean,
  context: ValidationContext,
): Promise<
  { ok: true; values: Record<string, unknown>[] } | { ok: false; error: string }
> {
  const results = await Promise.all(
    variants.map((raw, index) =>
      validateVariant(raw, requireAll, context).then((result) => ({ index, result })),
    ),
  );
  const failed = results.find((entry) => !entry.result.ok);
  if (failed && !failed.result.ok) {
    return { ok: false, error: `Variant ${failed.index + 1}: ${failed.result.error}` };
  }
  return {
    ok: true,
    values: results.map((entry) => {
      if (!entry.result.ok) {
        throw new Error("unreachable");
      }
      return entry.result.value;
    }),
  };
}
