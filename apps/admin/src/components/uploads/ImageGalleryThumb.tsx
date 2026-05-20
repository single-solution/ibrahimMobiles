"use client";

/**
 * One thumbnail tile inside `<ImageGallery>`. Owns the drag handle,
 * the alt-text inline editor, the hero badge, and the remove button.
 */

import { useId, useState } from "react";
import Image from "next/image";
import { Star, Trash2, ZoomIn } from "lucide-react";
import type { StoredImage } from "@store/shared";

interface ImageGalleryThumbProps {
  image: StoredImage;
  index: number;
  isHero: boolean;
  onAltChange: (alt: string) => void;
  onRemove: () => void;
  onPreview: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
}

export function ImageGalleryThumb({
  image,
  index,
  isHero,
  onAltChange,
  onRemove,
  onPreview,
  onDragStart,
  onDragOver,
  onDrop,
}: ImageGalleryThumbProps) {
  const altInputId = useId();
  const [altDraft, setAltDraft] = useState(image.alt);

  function commitAlt() {
    if (altDraft !== image.alt) onAltChange(altDraft);
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="group relative flex flex-col gap-1.5 rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-[var(--color-canvas-deep)]">
        <Image
          src={image.variants.thumb}
          alt={image.alt || `Image ${index + 1}`}
          width={image.width}
          height={image.height}
          placeholder={image.blurDataURL ? "blur" : "empty"}
          blurDataURL={image.blurDataURL || undefined}
          className="size-full object-cover"
        />
        {isHero && (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-500)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-ink-900)]">
            <Star size={10} /> Hero
          </span>
        )}
        <button
          type="button"
          aria-label="Preview"
          onClick={onPreview}
          className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/60"
        >
          <ZoomIn size={12} />
        </button>
        <button
          type="button"
          aria-label="Remove"
          onClick={onRemove}
          className="absolute right-1.5 bottom-1.5 rounded-full bg-[var(--color-rose-700)]/85 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-[var(--color-rose-700)]"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <label htmlFor={altInputId} className="sr-only">
        Alt text for image {index + 1}
      </label>
      <input
        id={altInputId}
        type="text"
        value={altDraft}
        onChange={(e) => setAltDraft(e.target.value)}
        onBlur={commitAlt}
        placeholder="Alt text"
        className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-[11.5px] text-[var(--color-ink-800)] focus:border-[var(--color-accent-500)] focus:bg-[var(--color-surface)] focus:outline-none"
      />
    </div>
  );
}
