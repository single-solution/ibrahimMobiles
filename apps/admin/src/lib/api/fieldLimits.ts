/**
 * Per-resource field length limits shared between list and detail handlers
 * for the same resource. Centralised so the POST and PUT handlers can't
 * drift into accepting different lengths for the same field.
 */

export const PRODUCT_FIELD_LIMITS = {
  modelName: 120,
  imageUrl: 500,
  slug: 96,
  /** Max number of bullet-point highlights stored per product. */
  highlightCount: 8,
} as const;

export const OFFER_FIELD_LIMITS = {
  title: 160,
  description: 400,
  discountLabel: 60,
  badgeLabel: 60,
} as const;

export const BRAND_FIELD_LIMITS = {
  name: 100,
  tagline: 200,
  /** Mirrors the default `slugify` cap — keep in sync if that default changes. */
  slug: 64,
} as const;

export const CATEGORY_FIELD_LIMITS = {
  label: 60,
  tagline: 280,
  emptyHint: 280,
  /** Max number of "trust chips" shown on a category card. */
  trustChipCount: 6,
} as const;

export const GRADE_FIELD_LIMITS = {
  label: 80,
  shortLabel: 40,
  description: 400,
  cosmeticNotes: 400,
  functionalNotes: 400,
} as const;
