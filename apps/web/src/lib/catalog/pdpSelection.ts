import type { Product, StorefrontVariant } from "@store/shared";

import { getDefaultVariant } from "@/lib/productSummary";

/** Internal selection map key for grade (URL uses {@link PDP_GRADE_PARAM}). */
export const GRADE_DIMENSION_KEY = "__grade";

export const PDP_GRADE_PARAM = "grade";
export const LEGACY_VARIANT_PARAM = "variant";

const RESERVED_PDP_PARAMS = new Set([PDP_GRADE_PARAM, LEGACY_VARIANT_PARAM, "compare"]);

export function attributeValuesOnVariant(
  variant: StorefrontVariant,
  slug: string,
): string[] {
  const raw = variant.attributes?.[slug];
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter((entry) => entry.length > 0);
  }
  return [raw];
}

function variantHasAttributeValue(
  variant: StorefrontVariant,
  slug: string,
  value: string,
): boolean {
  return attributeValuesOnVariant(variant, slug).includes(value);
}

export function variantMatchesSelection(
  variant: StorefrontVariant,
  selection: Record<string, string>,
): boolean {
  for (const [key, want] of Object.entries(selection)) {
    if (!want) {
      continue;
    }
    if (key === GRADE_DIMENSION_KEY) {
      if (variant.gradeSlug !== want) {
        return false;
      }
      continue;
    }
    if (!variantHasAttributeValue(variant, key, want)) {
      return false;
    }
  }
  return true;
}

function countMatchingDimensions(
  variant: StorefrontVariant,
  selection: Record<string, string>,
): number {
  let matchCount = 0;
  for (const [key, want] of Object.entries(selection)) {
    if (!want) {
      continue;
    }
    if (key === GRADE_DIMENSION_KEY) {
      if (variant.gradeSlug === want) {
        matchCount += 1;
      }
      continue;
    }
    if (variantHasAttributeValue(variant, key, want)) {
      matchCount += 1;
    }
  }
  return matchCount;
}

export function selectionFromVariant(
  variant: StorefrontVariant,
): Record<string, string> {
  const result: Record<string, string> = {
    [GRADE_DIMENSION_KEY]: variant.gradeSlug,
  };
  for (const slug of Object.keys(variant.attributes ?? {})) {
    const values = attributeValuesOnVariant(variant, slug);
    if (values.length > 0) {
      result[slug] = values[0];
    }
  }
  return result;
}

/**
 * Normalize the selection against a resolved variant while **preserving
 * the user's explicit picks for multi-value attributes**.
 *
 * Example: variant has `color: ["Black", "Violet"]` and the user clicked
 * Violet. We want the final selection to keep `color = Violet`, not flip
 * back to Black just because Black is the first value on the variant.
 */
export function selectionFromVariantPreservingPicks(
  variant: StorefrontVariant,
  picks: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {
    [GRADE_DIMENSION_KEY]: variant.gradeSlug,
  };
  for (const slug of Object.keys(variant.attributes ?? {})) {
    const values = attributeValuesOnVariant(variant, slug);
    if (values.length === 0) {
      continue;
    }
    const pick = picks[slug];
    result[slug] = pick && values.includes(pick) ? pick : values[0];
  }
  return result;
}

export function findVariantBySelection(
  variants: StorefrontVariant[],
  selection: Record<string, string>,
): StorefrontVariant | undefined {
  return variants.find((variant) => variantMatchesSelection(variant, selection));
}

export function findClosestVariant(
  variants: StorefrontVariant[],
  selection: Record<string, string>,
  priorityKey: string,
): StorefrontVariant | undefined {
  const pinnedValue = selection[priorityKey];
  let bestVariant: StorefrontVariant | undefined;
  let bestScore = -1;
  for (const variant of variants) {
    if (pinnedValue) {
      if (priorityKey === GRADE_DIMENSION_KEY) {
        if (variant.gradeSlug !== pinnedValue) {
          continue;
        }
      } else if (!variantHasAttributeValue(variant, priorityKey, pinnedValue)) {
        continue;
      }
    }
    const matchCount = countMatchingDimensions(variant, selection);
    const inStock = (variant.quantity ?? 0) > 0;
    const score =
      matchCount * 1000 +
      (inStock ? 10 : 0) -
      Math.min(9, Math.floor((variant.priceRupees ?? 0) / 100_000));
    if (score > bestScore) {
      bestScore = score;
      bestVariant = variant;
    }
  }
  return bestVariant;
}

function activeSelectionKeys(selection: Record<string, string>): string[] {
  return Object.entries(selection)
    .filter(([, value]) => value)
    .map(([key]) => key);
}

/**
 * Map chip picks → a real variant and a normalized selection.
 *
 * Rules:
 * - Exact match wins.
 * - When the shopper just clicked a chip (`priorityKey`), that value is
 *   honored unconditionally: only variants with that value are considered.
 *   This is what makes color/storage/SIM all equal-weight on chip clicks.
 * - When nothing matches the priority key (rare, e.g. clicked grade that
 *   suddenly has no variants), or no priority key was passed, fall through
 *   to the existing best-match scoring across all picked dimensions.
 */
export function resolvePickerSelection(
  variants: StorefrontVariant[],
  selection: Record<string, string>,
  priorityKey?: string,
): { variant: StorefrontVariant; selection: Record<string, string> } {
  if (variants.length === 0) {
    const empty: StorefrontVariant = {
      id: "",
      gradeSlug: "",
      priceRupees: 0,
      quantity: 0,
      warrantyDays: 0,
      attributes: {},
    };
    return { variant: empty, selection: {} };
  }

  const exact = findVariantBySelection(variants, selection);
  if (exact) {
    return {
      variant: exact,
      selection: selectionFromVariantPreservingPicks(exact, selection),
    };
  }

  // Clicked attribute wins unconditionally — never silently drop the click.
  if (priorityKey && selection[priorityKey]) {
    const pinned = findClosestVariant(variants, selection, priorityKey);
    if (pinned) {
      return {
        variant: pinned,
        selection: selectionFromVariantPreservingPicks(pinned, selection),
      };
    }
  }

  const keys = activeSelectionKeys(selection);
  const tryOrder = priorityKey
    ? [priorityKey, ...keys.filter((key) => key !== priorityKey)]
    : [...keys.filter((key) => key !== GRADE_DIMENSION_KEY), GRADE_DIMENSION_KEY];

  let best: StorefrontVariant | undefined;
  let bestMatchCount = -1;

  for (const key of tryOrder) {
    if (!selection[key]) {
      continue;
    }
    const closest = findClosestVariant(variants, selection, key);
    if (!closest) {
      continue;
    }
    const matchCount = countMatchingDimensions(closest, selection);
    if (matchCount > bestMatchCount) {
      bestMatchCount = matchCount;
      best = closest;
    }
  }

  if (best) {
    return { variant: best, selection: selectionFromVariant(best) };
  }

  const fallback = getDefaultVariant({ variants } as Product);
  return { variant: fallback, selection: selectionFromVariant(fallback) };
}

/**
 * Attribute slugs that are required to **show price** on this product.
 * An attribute counts as required when the product has variants differing
 * on that attribute — there is a real choice to make. If every variant
 * shares the same value (or the attribute is absent), it is not required.
 */
export function getRequiredAttributeSlugsForProduct(
  product: Product,
  categoryAttributeSlugs: string[],
): string[] {
  const required: string[] = [];
  for (const slug of categoryAttributeSlugs) {
    const distinct = new Set<string>();
    for (const variant of product.variants) {
      for (const value of attributeValuesOnVariant(variant, slug)) {
        distinct.add(value);
      }
    }
    if (distinct.size > 1) {
      required.push(slug);
    }
  }
  return required;
}

/** Grade + every required attribute has a value in the selection. */
export function isPdpSelectionComplete(
  selection: Record<string, string>,
  requiredAttributeSlugs: string[],
): boolean {
  if (!selection[GRADE_DIMENSION_KEY]) {
    return false;
  }
  for (const slug of requiredAttributeSlugs) {
    if (!selection[slug]) {
      return false;
    }
  }
  return true;
}

export function parsePdpSelectionFromSearch(
  search: { [key: string]: string | string[] | undefined },
  categoryAttributeSlugs: string[],
): Record<string, string> {
  const selection: Record<string, string> = {};
  const grade =
    typeof search[PDP_GRADE_PARAM] === "string" ? search[PDP_GRADE_PARAM] : "";
  if (grade) {
    selection[GRADE_DIMENSION_KEY] = grade;
  }
  for (const slug of categoryAttributeSlugs) {
    const raw = search[slug];
    if (typeof raw === "string" && raw.trim()) {
      selection[slug] = raw.trim();
    }
  }
  return selection;
}

export function readLegacyVariantId(
  search: { [key: string]: string | string[] | undefined },
): string | undefined {
  const raw = search[LEGACY_VARIANT_PARAM];
  return typeof raw === "string" ? raw : undefined;
}

export function selectionSignature(selection: Record<string, string>): string {
  return Object.entries(selection)
    .filter(([, value]) => value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

export function selectionToUrlPatch(
  selection: Record<string, string>,
  categoryAttributeSlugs: string[],
): Record<string, string | null> {
  const patch: Record<string, string | null> = {
    [LEGACY_VARIANT_PARAM]: null,
  };
  patch[PDP_GRADE_PARAM] = selection[GRADE_DIMENSION_KEY] || null;
  for (const slug of categoryAttributeSlugs) {
    patch[slug] = selection[slug] || null;
  }
  return patch;
}

export function hasPdpConfigurationInSearch(
  search: { [key: string]: string | string[] | undefined },
  categoryAttributeSlugs: string[],
): boolean {
  if (typeof search[PDP_GRADE_PARAM] === "string") {
    return true;
  }
  return categoryAttributeSlugs.some(
    (slug) => typeof search[slug] === "string" && search[slug] !== "",
  );
}

export function currentPdpSelectionSignature(
  search: { [key: string]: string | string[] | undefined },
  categoryAttributeSlugs: string[],
): string {
  return selectionSignature(
    parsePdpSelectionFromSearch(search, categoryAttributeSlugs),
  );
}

export function resolveProductVariantFromSelection(
  product: Product,
  selection: Record<string, string>,
): StorefrontVariant {
  return resolvePickerSelection(product.variants, selection).variant;
}

export function resolveProductVariantFromSearch(
  product: Product,
  search: { [key: string]: string | string[] | undefined },
  categoryAttributeSlugs: string[],
): StorefrontVariant {
  const legacyId = readLegacyVariantId(search);
  if (legacyId) {
    const legacy = product.variants.find((row) => row.id === legacyId);
    if (legacy) {
      return legacy;
    }
  }
  const selection = parsePdpSelectionFromSearch(search, categoryAttributeSlugs);
  if (
    !hasPdpConfigurationInSearch(search, categoryAttributeSlugs) &&
    !legacyId
  ) {
    return getDefaultVariant(product);
  }
  return resolveProductVariantFromSelection(product, selection);
}

/**
 * Strict variant lookup used when hydrating from the URL — returns the
 * exact variant matching the full picked selection, or null when the
 * combination doesn't exist on any variant (bad bookmark / stale share).
 */
export function resolveExactVariantFromSearch(
  product: Product,
  search: { [key: string]: string | string[] | undefined },
  categoryAttributeSlugs: string[],
): StorefrontVariant | null {
  const legacyId = readLegacyVariantId(search);
  if (legacyId) {
    return product.variants.find((row) => row.id === legacyId) ?? null;
  }
  if (!hasPdpConfigurationInSearch(search, categoryAttributeSlugs)) {
    return null;
  }
  const selection = parsePdpSelectionFromSearch(search, categoryAttributeSlugs);
  return findVariantBySelection(product.variants, selection) ?? null;
}

export function categoryAttributeSlugsFromProduct(product: Product): string[] {
  const slugs = new Set<string>();
  for (const variant of product.variants) {
    for (const slug of Object.keys(variant.attributes ?? {})) {
      slugs.add(slug);
    }
  }
  return Array.from(slugs).sort((a, b) => a.localeCompare(b));
}

export function isReservedPdpParam(key: string): boolean {
  return RESERVED_PDP_PARAMS.has(key);
}
