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
}

export function ProductImage({
  imageUrl,
  brandName,
  modelName,
  colorName,
  brandSlug,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
}: ProductImageProps) {
  const [hasFailed, setHasFailed] = useState(false);

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
      className="object-cover"
      onError={() => setHasFailed(true)}
    />
  );
}
