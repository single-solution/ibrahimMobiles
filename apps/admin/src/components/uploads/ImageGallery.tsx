"use client";

/**
 * Multi-image ordered gallery. Used for `Variant.images[]` (and future
 * chat-image attachments — T8.5). The first image is the hero. Drag to
 * reorder, click the `x` to remove, click a thumb body to open the
 * full-resolution lightbox.
 */

import { useId, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { StoredImage } from "@store/shared";

import { ImageGalleryThumb } from "./ImageGalleryThumb";
import { Lightbox } from "./Lightbox";
import {
  collectStoredImageUrls,
  removeStoredUrls,
  uploadImage,
} from "./uploadClient";

interface ImageGalleryProps {
  value: StoredImage[];
  onChange: (images: StoredImage[]) => void;
  /** Alt-text seed. The gallery appends ` · image <N>` per file. */
  altSeed?: string;
  /** Subject kind sent in the storage key prefix (e.g. `products`). */
  subjectKind?: string;
  /** Subject id (e.g. product id + variant id concatenated). */
  subjectId?: string;
  /** Optional cap on the number of images. */
  maxImages?: number;
  /** Optional label rendered above the grid. */
  label?: string;
}

const DEFAULT_MAX = 8;

export function ImageGallery({
  value,
  onChange,
  altSeed,
  subjectKind,
  subjectId,
  maxImages = DEFAULT_MAX,
  label,
}: ImageGalleryProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const remainingSlots = Math.max(0, maxImages - value.length);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    const accepted = Array.from(files).slice(0, remainingSlots);
    try {
      const additions: StoredImage[] = [];
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const altIndex = value.length + i + 1;
        const seededAlt = altSeed ? `${altSeed} · image ${altIndex}` : undefined;
        try {
          const stored = await uploadImage({
            file,
            altSeed: seededAlt,
            subjectKind,
            subjectId,
          });
          additions.push(stored);
        } catch (uploadError) {
          setError(
            uploadError instanceof Error
              ? `Failed to upload "${file.name}": ${uploadError.message}`
              : `Failed to upload "${file.name}"`,
          );
        }
      }
      if (additions.length > 0) onChange([...value, ...additions]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(index: number) {
    const removed = value[index];
    if (!removed) return;
    const next = value.slice(0, index).concat(value.slice(index + 1));
    onChange(next);
    await removeStoredUrls(collectStoredImageUrls(removed));
  }

  function handleAltChange(index: number, alt: string) {
    const next = value.map((image, i) => (i === index ? { ...image, alt } : image));
    onChange(next);
  }

  function handleDragStart(index: number) {
    dragIndex.current = index;
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function handleDrop(targetIndex: number) {
    const source = dragIndex.current;
    dragIndex.current = null;
    if (source === null || source === targetIndex) return;
    const next = value.slice();
    const [moved] = next.splice(source, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]"
        >
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        disabled={busy || remainingSlots === 0}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {value.map((image, index) => (
          <ImageGalleryThumb
            key={image.variants.thumb}
            image={image}
            index={index}
            isHero={index === 0}
            onAltChange={(alt) => handleAltChange(index, alt)}
            onRemove={() => handleRemove(index)}
            onPreview={() => setLightboxIndex(index)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
          />
        ))}
        {remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] p-2 text-[var(--color-ink-500)] transition hover:border-[var(--color-accent-400)] hover:text-[var(--color-accent-700)] disabled:opacity-60"
          >
            <ImagePlus size={20} />
            <span className="text-[11.5px] font-semibold">
              {busy ? "Uploading…" : "Add"}
            </span>
            <span className="text-[10.5px]">
              {value.length}/{maxImages}
            </span>
          </button>
        )}
      </div>
      {error && (
        <p className="text-[12px] text-[var(--color-rose-700)]" role="alert">
          {error}
        </p>
      )}
      {lightboxIndex !== null && (
        <Lightbox
          urls={value.map((image) => image.variants.full)}
          initialIndex={lightboxIndex}
          alt={value[lightboxIndex]?.alt}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
