/**
 * Storefront upload limits — kept aligned with `apps/admin/src/lib/uploads/limits.ts`.
 *
 * The two apps deliberately ship parallel copies (rather than a shared
 * module) so the heavy `sharp` dependency stays out of `@store/shared`,
 * which is consumed by every package in the monorepo.
 */

export const MAX_IMAGE_MB = 8;
export const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
export const MAX_SOURCE_DIMENSION = 4000;

/** Storefront file attachments (PDF, doc, …) for chat. */
export const MAX_FILE_MB = 10;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

export const ALLOWED_FILE_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
] as const;
export type AllowedFileMime = (typeof ALLOWED_FILE_MIME)[number];

export const IMAGE_VARIANT_WIDTHS = {
  thumb: 160,
  card: 480,
  detail: 1080,
  full: 2400,
} as const;
export type ImageVariantName = keyof typeof IMAGE_VARIANT_WIDTHS;

export const WEBP_QUALITY = 78;
export const WEBP_EFFORT = 4;
export const BLURHASH_DIMENSION = 32;
