"use client";

import { useState } from "react";
import Image from "next/image";

import type { StoredImage, StoredImageVariantKey } from "@store/shared";

import { PhoneVisual } from "@/components/shared/PhoneVisual";

interface ProductImageProps {
  /** Multi-resolution image record. Optional so we can fall back to PhoneVisual. */
  image?: StoredImage | null;
  /** Which pre-rendered variant to prefer for this surface. */
  variant?: StoredImageVariantKey;
  /** Display-friendly product name (for alt + fallback). */
  name: string;
  brandName: string;
  brandSlug: string;
  sizes?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain";
}

/**
 * Hero image for the storefront product card / PDP / wishlist.
 *
 * Reads from a `StoredImage` (Phase 1 schema). The caller picks the
 * variant (`thumb` for tiny tiles, `card` for product cards, `detail`
 * for PDP hero, `full` for zoom). On error (CDN miss) we degrade to the
 * synthesised `<PhoneVisual>` fallback rather than render a broken
 * `<img>`.
 */
export function ProductImage({
  image,
  variant = "card",
  name,
  brandName,
  brandSlug,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  objectFit = "cover",
}: ProductImageProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  if (hasFailed || !image) {
    return (
      <PhoneVisual
        brandName={brandName}
        modelName={name}
        colorName=""
        brandSlug={brandSlug}
        size="md"
      />
    );
  }

  const src = image.variants[variant] ?? image.variants.card;
  const altText = image.alt || `${brandName} ${name}`;

  return (
    <Image
      src={src}
      alt={altText}
      fill
      sizes={sizes}
      priority={priority}
      placeholder={image.blurDataURL ? "blur" : undefined}
      blurDataURL={image.blurDataURL || undefined}
      data-img-fade={hasLoaded ? "true" : "false"}
      className={objectFit === "contain" ? "object-contain" : "object-cover"}
      onLoad={() => setHasLoaded(true)}
      onError={() => setHasFailed(true)}
    />
  );
}
