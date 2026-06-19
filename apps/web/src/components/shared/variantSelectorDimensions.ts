"use client";

import {
  resolveVariantAttributeLabel,
  type AttributeDescriptor,
  type GradeDescriptor,
  type Product,
  type Variant,
} from "@store/shared";

import { toAttributeLabelSource } from "@/lib/catalog/attributeLabels";
import {
  attributeValuesOnVariant,
  findVariantBySelection,
  GRADE_DIMENSION_KEY,
  variantsForGrade,
} from "@/lib/catalog/pdpSelection";

export { variantsForGrade } from "@/lib/catalog/pdpSelection";

export const EMPTY_VARIANT: Variant = {
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

  // Grade row only when the shopper has a real choice (2+ grades on this SKU).
  const gradeOptions = collectGradeOptions(product.variants, grades);
  if (gradeOptions.length >= 2) {
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
  variants: Variant[],
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
  variants: Variant[],
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

type OptionStateValue = "selected" | "available" | "unavailable" | "out_of_stock";

export function computeOptionState(
  dimensionKey: string,
  optionKey: string,
  variants: Variant[],
  currentSelection: Record<string, string>,
): OptionStateValue {
  if (currentSelection[dimensionKey] === optionKey) {
    return "selected";
  }
  const probe = { ...currentSelection, [dimensionKey]: optionKey };
  const exact = findVariantBySelection(variants, probe);
  if (exact) {
    return (exact.quantity ?? 0) > 0 ? "available" : "out_of_stock";
  }
  // Exists on this grade but not with every other pick — still clickable;
  // resolvePickerSelection realigns the remaining dimensions on click.
  const withValue = variants.filter((variant) =>
    attributeValuesOnVariant(variant, dimensionKey).includes(optionKey),
  );
  if (withValue.length === 0) {
    return "unavailable";
  }
  const hasStock = withValue.some((variant) => (variant.quantity ?? 0) > 0);
  return hasStock ? "available" : "out_of_stock";
}

/** Variants matching every upstream dimension pick (hierarchy filter). */
export function variantsForUpstreamSelection(
  variants: Variant[],
  dimensions: Dimension[],
  dimensionIndex: number,
  selection: Record<string, string>,
): Variant[] {
  const upstreamDimensions = dimensions.slice(0, dimensionIndex);
  return variants.filter((variant) =>
    upstreamDimensions.every((dimension) => {
      const picked = selection[dimension.key];
      if (!picked) {
        return true;
      }
      if (dimension.isGrade) {
        return variant.gradeSlug === picked;
      }
      return attributeValuesOnVariant(variant, dimension.key).includes(picked);
    }),
  );
}

/** Options that exist given upstream picks — hides invalid combos (hierarchy / option D). */
export function filterOptionsForUpstreamSelection(
  dimension: Dimension,
  dimensionIndex: number,
  dimensions: Dimension[],
  variants: Variant[],
  selection: Record<string, string>,
): DimensionOption[] {
  const scoped = variantsForUpstreamSelection(
    variants,
    dimensions,
    dimensionIndex,
    selection,
  );
  return dimension.options.filter((option) =>
    scoped.some((variant) =>
      dimension.isGrade
        ? variant.gradeSlug === option.key
        : attributeValuesOnVariant(variant, dimension.key).includes(option.key),
    ),
  );
}

/** Short intro under the configurator card title (hierarchy UX). */
export function buildConfiguratorIntroHint(dimensions: Dimension[]): string | null {
  if (dimensions.length <= 1) {
    return null;
  }
  const firstLabel = dimensions[0]?.label.toLowerCase();
  if (!firstLabel) {
    return null;
  }
  return `Pick ${firstLabel} first — the options below update to match.`;
}

/** Short hint under each configurator row for hierarchy UX. */
export function buildDimensionRowHint(
  dimension: Dimension,
  dimensionIndex: number,
  dimensions: Dimension[],
  selection: Record<string, string>,
): string | null {
  if (dimensions.length <= 1) {
    return null;
  }
  if (dimensionIndex === 0) {
    return "Pick this first — the rows below update to match.";
  }
  const upstreamLabels = dimensions.slice(0, dimensionIndex).flatMap((upstream) => {
    const picked = selection[upstream.key];
    if (!picked) {
      return [];
    }
    return [optionLabelForKey(upstream, picked)];
  });
  if (upstreamLabels.length === 0) {
    return null;
  }
  return `Showing ${dimension.label.toLowerCase()} options for ${upstreamLabels.join(" · ")}.`;
}

/** Options that appear on at least one variant in the active grade. */
export function filterOptionsForGrade(
  dimension: Dimension,
  variants: Variant[],
  gradeSlug: string,
): DimensionOption[] {
  if (dimension.isGrade || !gradeSlug) {
    return dimension.options;
  }
  const scoped = variantsForGrade(variants, gradeSlug);
  return dimension.options.filter((option) =>
    scoped.some((variant) =>
      attributeValuesOnVariant(variant, dimension.key).includes(option.key),
    ),
  );
}

export function gradeOptionState(
  optionKey: string,
  variants: Variant[],
  currentSelection: Record<string, string>,
): OptionStateValue {
  if (currentSelection[GRADE_DIMENSION_KEY] === optionKey) {
    return "selected";
  }
  const gradeVariants = variantsForGrade(variants, optionKey);
  if (gradeVariants.length === 0) {
    return "unavailable";
  }
  const hasStock = gradeVariants.some((variant) => (variant.quantity ?? 0) > 0);
  return hasStock ? "available" : "out_of_stock";
}

function optionLabelForKey(dimension: Dimension, key: string): string {
  return dimension.options.find((option) => option.key === key)?.label ?? key;
}

/** Human-readable "3 colours · 2 storage" hint under the builder title. */
export function formatDimensionOverview(
  dimensions: Dimension[],
  variants: Variant[],
  gradeSlug: string,
): string | null {
  const parts = dimensions
    .map((dimension) => {
      const options = filterOptionsForGrade(dimension, variants, gradeSlug);
      if (options.length <= 1) {
        return null;
      }
      return `${options.length} ${dimension.label.toLowerCase()} options`;
    })
    .filter((part): part is string => Boolean(part));

  if (parts.length === 0) {
    return null;
  }
  return parts.join(" · ");
}

/** Live summary of what the shopper has configured so far. */
export function formatConfigurationSummary(
  dimensions: Dimension[],
  selection: Record<string, string>,
  gradeLabel?: string,
): string | null {
  const parts: string[] = [];
  const gradeKey = selection[GRADE_DIMENSION_KEY];
  if (gradeKey) {
    const gradeDimension = dimensions.find((dimension) => dimension.isGrade);
    parts.push(
      gradeDimension
        ? optionLabelForKey(gradeDimension, gradeKey)
        : gradeLabel ?? gradeKey,
    );
  }
  for (const dimension of dimensions) {
    if (dimension.isGrade) {
      continue;
    }
    const key = selection[dimension.key];
    if (!key) {
      continue;
    }
    parts.push(optionLabelForKey(dimension, key));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** When a pick realigns other dimensions, explain what changed. */
export function describePickRealignment(
  dimensions: Dimension[],
  before: Record<string, string>,
  after: Record<string, string>,
  clickedDimensionKey: string,
  _gradeLabel?: string,
): string | null {
  if (clickedDimensionKey === GRADE_DIMENSION_KEY) {
    return null;
  }

  const adjustedLabels: string[] = [];
  for (const dimension of dimensions) {
    if (dimension.key === clickedDimensionKey || dimension.isGrade) {
      continue;
    }
    const previousKey = before[dimension.key];
    const nextKey = after[dimension.key];
    if (!nextKey || previousKey === nextKey) {
      continue;
    }
    adjustedLabels.push(optionLabelForKey(dimension, nextKey));
  }

  if (adjustedLabels.length === 0) {
    return null;
  }

  const clickedDimension = dimensions.find((dimension) => dimension.key === clickedDimensionKey);
  const clickedLabel = clickedDimension
    ? optionLabelForKey(clickedDimension, after[clickedDimensionKey] ?? "")
    : after[clickedDimensionKey];
  const subject = formatClickedSubject(clickedDimension, clickedLabel);
  const includes = joinNaturalList(adjustedLabels);

  return `${subject} has ${includes}.`;
}

function formatClickedSubject(
  clickedDimension: Dimension | undefined,
  clickedLabel: string,
): string {
  if (!clickedDimension?.label) {
    return clickedLabel;
  }
  return `${clickedLabel} ${clickedDimension.label.toLowerCase()}`;
}

function joinNaturalList(parts: string[]): string {
  if (parts.length === 1) {
    return parts[0] ?? "";
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export function describeSelection(
  variant: Variant,
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
