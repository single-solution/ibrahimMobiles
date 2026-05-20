/**
 * `@store/shared/storage/types`
 *
 * Universal types for the storage / image pipeline. Phase 1 forward-declares
 * the **`StoredImage`** shape so every Mongoose model can reference it from
 * day one (Category icon, Offer banner, Setting logo/favicon/OG, Variant
 * images, future Inquiry attachments). The runtime upload pipeline that
 * actually produces these objects — `sharp` resize, `StorageProvider`
 * abstraction (Vercel Blob today, S3-ready), single `POST /api/uploads`
 * route — is wired up in Phase 2 (TASKS.md T2.x).
 *
 * Rule of thumb (PLAN.md §10): if a field on any model carries an *image*,
 * it MUST be typed as `StoredImage` (or `StoredImage[]` / `StoredImage?`).
 * Raw `imageUrl: string` is forbidden and is enforced by the lint sweep at
 * the root `npm run lint:no-raw-image-urls`.
 */

/**
 * Pre-rendered WebP variants generated server-side on upload. Every URL is
 * the right size for its consumer — no `?w=480&q=75` runtime params — which
 * keeps CDN cache-hit ratio near 100% and removes runtime optimization cost.
 *
 *   - `thumb`  : ≤  160w — admin gallery thumbnails, hero badge crops, OG-card collage tiles.
 *   - `card`   : ≤  480w — storefront `ProductCard` hero, related-product rails, mobile PDP hero.
 *   - `detail` : ≤ 1080w — desktop / tablet PDP hero, dynamic OG image input.
 *   - `full`   : ≤ 2400w — lightbox / zoom view; ALSO the source if upload ≤ 2400w.
 */
export interface StoredImageVariants {
  thumb: string;
  card: string;
  detail: string;
  full: string;
}

/**
 * The canonical image record. Persisted as an embedded sub-document on
 * every model that needs an image. Storage-agnostic by design — the
 * `variants.*` URLs are plain HTTPS strings, so the same `StoredImage` can
 * point at `*.public.blob.vercel-storage.com` today and `cdn.<domain>`
 * (S3 + CloudFront) tomorrow without touching the schema or any renderer.
 *
 * `width`/`height` are SOURCE dimensions (needed by `next/image` to reserve
 * layout space and prevent CLS). `blurDataURL` is a ~200-byte base64 32×32
 * blur that inlines into the HTML for instant placeholders.
 */
export interface StoredImage {
  variants: StoredImageVariants;
  blurDataURL: string;
  width: number;
  height: number;
  alt: string;
}

/**
 * Variant keys exposed at the type level so renderers can switch on them
 * without magic strings.
 */
export type StoredImageVariantKey = keyof StoredImageVariants;

/**
 * Type guard to detect a `StoredImage` at runtime. Useful when deserialising
 * a `Setting.value` blob whose shape is `unknown` until we know its `key`.
 */
export function isStoredImage(value: unknown): value is StoredImage {
  if (value === null || typeof value !== "object") return false;
  const v = value as Partial<StoredImage>;
  if (
    typeof v.blurDataURL !== "string" ||
    typeof v.width !== "number" ||
    typeof v.height !== "number" ||
    typeof v.alt !== "string"
  ) {
    return false;
  }
  if (v.variants === null || typeof v.variants !== "object") return false;
  const variants = v.variants as Partial<StoredImageVariants>;
  return (
    typeof variants.thumb === "string" &&
    typeof variants.card === "string" &&
    typeof variants.detail === "string" &&
    typeof variants.full === "string"
  );
}
