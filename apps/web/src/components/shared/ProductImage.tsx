"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import type { StoredImage, StoredImageVariantKey } from "@store/shared";

import { PhoneVisual } from "@/components/shared/PhoneVisual";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

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
  onLoadComplete?: () => void;
}

/**
 * Hero image for the storefront product card and PDP.
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
  onLoadComplete,
}: ProductImageProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  // Logical OR (not `??`) so an empty-string variant (legacy seed data that
  // wrote `""` instead of dropping the key) still falls through to the next
  // best variant rather than producing `<Image src="">`. Without this the PDP
  // hero shows a blank well while the listing card (which asks for the `card`
  // variant directly) renders fine.
  const src =
    image?.variants[variant] || image?.variants.card || image?.variants.full || "";
  const showLoadFade = !priority;

  useEffect(() => {
    scheduleStateUpdate(() => {
      setHasFailed(false);
      if (showLoadFade) {
        setHasLoaded(false);
      }
    });
  }, [src, showLoadFade]);

  if (hasFailed || !image || !src) {
    return (
      <PhoneVisual
        brandName={brandName}
        modelName={name}
        colorName=""
        brandSlug={brandSlug}
        size="md"
        className="product-media-well"
      />
    );
  }

  const altText = image.alt || `${brandName} ${name}`;

  return (
    <div className="product-media-well relative size-full">
      <Image
        src={src}
        alt={altText}
        fill
        sizes={sizes}
        priority={priority}
        placeholder={image.blurDataURL ? "blur" : undefined}
        blurDataURL={image.blurDataURL || undefined}
        data-img-fade={showLoadFade && !hasLoaded ? "false" : "true"}
        className="object-cover object-center"
        onLoad={() => {
          setHasLoaded(true);
          onLoadComplete?.();
        }}
        onError={() => setHasFailed(true)}
      />
    </div>
  );
}
