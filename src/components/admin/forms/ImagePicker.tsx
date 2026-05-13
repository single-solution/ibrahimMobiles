"use client";

import { Plus } from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { classNames } from "@/lib/utils";

interface ImagePickerProps {
  label: string;
  imageUrls: string[];
  brandSlug: string;
  brandName: string;
  modelName: string;
  onAddPlaceholder?: () => void;
}

export function ImagePicker({
  label,
  imageUrls,
  brandSlug,
  brandName,
  modelName,
  onAddPlaceholder,
}: ImagePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {imageUrls.map((imageUrl, index) => (
          <div
            key={`${imageUrl}-${index}`}
            className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
          >
            <ProductImage
              imageUrl={imageUrl}
              brandName={brandName}
              brandSlug={brandSlug}
              modelName={modelName}
              colorName=""
              sizes="120px"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={onAddPlaceholder}
          className={classNames(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-500)] transition-colors",
            "hover:border-[var(--color-ink-400)] hover:text-[var(--color-ink-800)]",
          )}
        >
          <Plus size={18} />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Add image</span>
        </button>
      </div>
    </div>
  );
}
