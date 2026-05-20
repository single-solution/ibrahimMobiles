/**
 * In-memory shape for the `/products/new` form. Mirrors the AdminVariant
 * payload but every field is optional during authoring; `validate()` is
 * the canonical conversion to a clean POST body.
 */

import type { StoredImage } from "@store/shared";

import type {
  AdminAttribute,
  AdminBrand,
  AdminCategory,
  AdminGrade,
} from "@/types/admin";

export interface VariantDraft {
  /** Local-only React key so the same draft can be re-rendered after edits. */
  uid: string;
  gradeSlug: string;
  priceRupees: number;
  quantity: number;
  warrantyMonths: number | null;
  images: StoredImage[];
  attributes: Record<string, string>;
}

export interface ProductDraft {
  categorySlug: string;
  brandSlug: string;
  name: string;
  isFeatured: boolean;
  isActive: boolean;
  variants: VariantDraft[];
}

/** Per-category data the form needs to render. Loaded via the server page. */
export interface CategorySurface {
  category: AdminCategory;
  brands: AdminBrand[];
  grades: AdminGrade[];
  attributes: AdminAttribute[];
}

let variantCounter = 0;
export function newVariantUid(): string {
  variantCounter += 1;
  return `v-${Date.now().toString(36)}-${variantCounter}`;
}

export function emptyDraft(): ProductDraft {
  return {
    categorySlug: "",
    brandSlug: "",
    name: "",
    isFeatured: false,
    isActive: true,
    variants: [],
  };
}

export function emptyVariantDraft(): VariantDraft {
  return {
    uid: newVariantUid(),
    gradeSlug: "",
    priceRupees: 0,
    quantity: 0,
    warrantyMonths: null,
    images: [],
    attributes: {},
  };
}

export interface ProductValidationError {
  /** Path like "name", "variants.0.gradeSlug", "variants.1.attributes.storage". */
  path: string;
  message: string;
}

export interface ProductValidationOk {
  ok: true;
  payload: {
    name: string;
    categorySlug: string;
    brandSlug: string;
    isFeatured: boolean;
    isActive: boolean;
    variants: Array<{
      gradeSlug: string;
      priceRupees: number;
      quantity: number;
      warrantyMonths?: number;
      images: StoredImage[];
      attributes: Record<string, string>;
    }>;
  };
}

export interface ProductValidationFail {
  ok: false;
  errors: ProductValidationError[];
}

export function validateDraft(
  draft: ProductDraft,
  surface: CategorySurface | null,
): ProductValidationOk | ProductValidationFail {
  const errors: ProductValidationError[] = [];

  if (!draft.categorySlug) {
    errors.push({ path: "categorySlug", message: "Pick a category." });
  }
  if (!draft.brandSlug) {
    errors.push({ path: "brandSlug", message: "Pick a brand." });
  }
  const name = draft.name.trim();
  if (name.length < 2) {
    errors.push({ path: "name", message: "Product name is required." });
  } else if (name.length > 120) {
    errors.push({ path: "name", message: "Product name is too long (max 120)." });
  }

  if (draft.variants.length === 0) {
    errors.push({ path: "variants", message: "Add at least one variant." });
  }

  const requiredAttributes = (surface?.attributes ?? []).filter(
    (attr) => attr.isActive,
  );

  draft.variants.forEach((variant, index) => {
    if (!variant.gradeSlug) {
      errors.push({
        path: `variants.${index}.gradeSlug`,
        message: "Pick a grade.",
      });
    }
    if (variant.images.length === 0) {
      errors.push({
        path: `variants.${index}.images`,
        message: "Add at least one image.",
      });
    }
    if (!Number.isInteger(variant.priceRupees) || variant.priceRupees < 0) {
      errors.push({
        path: `variants.${index}.priceRupees`,
        message: "Price must be a non-negative whole number.",
      });
    }
    if (!Number.isInteger(variant.quantity) || variant.quantity < 0) {
      errors.push({
        path: `variants.${index}.quantity`,
        message: "Quantity must be a non-negative whole number.",
      });
    }
    if (
      variant.warrantyMonths !== null &&
      (!Number.isInteger(variant.warrantyMonths) || variant.warrantyMonths < 0)
    ) {
      errors.push({
        path: `variants.${index}.warrantyMonths`,
        message: "Warranty months must be a non-negative whole number.",
      });
    }
    for (const attr of requiredAttributes) {
      const selected = variant.attributes[attr.slug];
      if (!selected) {
        errors.push({
          path: `variants.${index}.attributes.${attr.slug}`,
          message: `Select a ${attr.label.toLowerCase()}.`,
        });
        continue;
      }
      const valid = attr.options.some((opt) => opt.value === selected);
      if (!valid) {
        errors.push({
          path: `variants.${index}.attributes.${attr.slug}`,
          message: `Invalid ${attr.label.toLowerCase()} value.`,
        });
      }
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      name,
      categorySlug: draft.categorySlug,
      brandSlug: draft.brandSlug,
      isFeatured: draft.isFeatured,
      isActive: draft.isActive,
      variants: draft.variants.map((variant) => {
        const out: ProductValidationOk["payload"]["variants"][number] = {
          gradeSlug: variant.gradeSlug,
          priceRupees: variant.priceRupees,
          quantity: variant.quantity,
          images: variant.images,
          attributes: { ...variant.attributes },
        };
        if (variant.warrantyMonths !== null) {
          out.warrantyMonths = variant.warrantyMonths;
        }
        return out;
      }),
    },
  };
}

export function errorsByPath(errors: ProductValidationError[]) {
  const map = new Map<string, string>();
  for (const error of errors) {
    if (!map.has(error.path)) {
      map.set(error.path, error.message);
    }
  }
  return map;
}
