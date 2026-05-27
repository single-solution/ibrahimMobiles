"use client";

import {
  resolveVariantAttributeLabel,
  type AttributeDescriptor,
  type GradeDescriptor,
  type Product,
  type StorefrontVariant,
} from "@store/shared";

import { toAttributeLabelSource } from "@/lib/catalog/attributeLabels";
import {
  attributeValuesOnVariant,
  findVariantBySelection,
  GRADE_DIMENSION_KEY,
} from "@/lib/catalog/pdpSelection";

export const EMPTY_VARIANT: StorefrontVariant = {
  id: "",
  gradeSlug: "",
  priceRupees: 0,
  quantity: 0,
  warrantyDays: 0,
  attributes: {},
};

export interface DimensionOption {
  /** Canonical key used by the matrix; for `string[]` we join with the multi-value sep. */
  key: string;
  label: string;
  /** Optional solid colour for swatch chips (storage/RAM rarely set it, colour usually does). */
  backgroundColor?: string;
  /** Grade-only — short condition blurb shown under the grade chip. */
  notes?: string;
}

export interface Dimension {
  key: string;
  label: string;
  /** True when the dimension is `__grade`. Rendered as the hero row. */
  isGrade: boolean;
  options: DimensionOption[];
}

export function formatMissingPrompt(attributeLabels: string[]): string {
  if (attributeLabels.length === 0) {
    return "Select options to see price";
  }
  if (attributeLabels.length === 1) {
    return `Select ${attributeLabels[0]} to see price`;
  }
  if (attributeLabels.length === 2) {
    return `Select ${attributeLabels[0]} and ${attributeLabels[1]} to see price`;
  }
  const head = attributeLabels.slice(0, -1).join(", ");
  const tail = attributeLabels[attributeLabels.length - 1];
  return `Select ${head}, and ${tail} to see price`;
}

/* ─────────────────────── Selection / matching helpers ─────────────────────── */

export function buildDimensions(
  product: Product,
  attributeDefinitions: AttributeDescriptor[],
  grades: GradeDescriptor[],
): Dimension[] {
  const dimensions: Dimension[] = [];

  // Grade dimension — always first when ≥ 2 grades exist on this product.
  const gradeOptions = collectGradeOptions(product.variants, grades);
  if (gradeOptions.length > 0) {
    dimensions.push({
      key: GRADE_DIMENSION_KEY,
      label: "Grade",
      isGrade: true,
      options: gradeOptions,
    });
  }

  for (const attribute of attributeDefinitions) {
    const options = collectAttributeOptions(product.variants, attribute);
    if (options.length === 0) {
      continue;
    }
    dimensions.push({
      key: attribute.slug,
      label: attribute.label,
      isGrade: false,
      options,
    });
  }

  return dimensions;
}

function collectGradeOptions(
  variants: StorefrontVariant[],
  grades: GradeDescriptor[],
): DimensionOption[] {
  const usedSlugs = new Set<string>();
  for (const variant of variants) {
    if (variant.gradeSlug) usedSlugs.add(variant.gradeSlug);
  }
  if (usedSlugs.size === 0) {
    return [];
  }
  const gradeBySlug = new Map(grades.map((row) => [row.slug, row] as const));
  const ordered: DimensionOption[] = [];
  // Preserve admin grade order when a descriptor exists; fall back to slug.
  for (const grade of grades) {
    if (!usedSlugs.has(grade.slug)) continue;
    ordered.push({
      key: grade.slug,
      label: grade.label,
      backgroundColor: grade.color,
      notes: grade.notes,
    });
  }
  for (const slug of usedSlugs) {
    if (gradeBySlug.has(slug)) continue;
    ordered.push({ key: slug, label: slug });
  }
  return ordered;
}

function collectAttributeOptions(
  variants: StorefrontVariant[],
  attribute: AttributeDescriptor,
): DimensionOption[] {
  const seen = new Map<string, DimensionOption>();
  const source = toAttributeLabelSource(attribute);

  for (const variant of variants) {
    for (const value of attributeValuesOnVariant(variant, attribute.slug)) {
      if (seen.has(value)) {
        continue;
      }
      const optionDescriptor = attribute.options.find((row) => row.value === value);
      seen.set(value, {
        key: value,
        label: resolveVariantAttributeLabel(
          source,
          value,
          variant.attributeDisplay,
        ),
        backgroundColor: optionDescriptor?.backgroundColor,
      });
    }
  }
  return Array.from(seen.values());
}

type OptionStateValue = "selected" | "available" | "unavailable";

export function computeOptionState(
  dimensionKey: string,
  optionKey: string,
  variants: StorefrontVariant[],
  currentSelection: Record<string, string>,
): OptionStateValue {
  if (currentSelection[dimensionKey] === optionKey) {
    return "selected";
  }
  const probe = { ...currentSelection, [dimensionKey]: optionKey };
  const exact = findVariantBySelection(variants, probe);
  if (exact) return "available";
  // If the option exists on any variant ignoring everything but itself, it's
  // technically pickable — we just flag it as unavailable in the current combo.
  return "unavailable";
}

export function describeSelection(
  variant: StorefrontVariant,
  attributes: AttributeDescriptor[],
): string {
  const parts: string[] = [];
  for (const attribute of attributes) {
    const raw = variant.attributes?.[attribute.slug];
    if (!raw) continue;
    const values = Array.isArray(raw) ? raw : [raw];
    const source = toAttributeLabelSource(attribute);
    const labels = values
      .map((value) =>
        resolveVariantAttributeLabel(source, value, variant.attributeDisplay),
      )
      .filter((label) => label.length > 0);
    if (labels.length > 0) {
      parts.push(labels.join(" · "));
    }
  }
  return parts.join(" · ");
}
