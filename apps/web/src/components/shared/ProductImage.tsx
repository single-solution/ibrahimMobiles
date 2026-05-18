"use client";

import { useState } from "react";
import Image from "next/image";
import { PhoneVisual } from "@/components/shared/PhoneVisual";

interface ProductImageProps {
  imageUrl: string;
  brandName: string;
  modelName: string;
  colorName: string;
  brandSlug: string;
  sizes?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain";
}

export function ProductImage({
  imageUrl,
  brandName,
  modelName,
  colorName,
  brandSlug,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  objectFit = "cover",
}: ProductImageProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  if (hasFailed || !imageUrl) {
    return (
      <PhoneVisual
        brandName={brandName}
        modelName={modelName}
        colorName={colorName}
        brandSlug={brandSlug}
        size="md"
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={`${brandName} ${modelName} in ${colorName}`}
      fill
      sizes={sizes}
      priority={priority}
      data-img-fade={hasLoaded ? "true" : "false"}
      className={objectFit === "contain" ? "object-contain" : "object-cover"}
      onLoad={() => setHasLoaded(true)}
      onError={() => setHasFailed(true)}
    />
  );
}
