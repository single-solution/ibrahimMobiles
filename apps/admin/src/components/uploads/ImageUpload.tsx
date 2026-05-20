"use client";

/**
 * Single-image input. Used everywhere the model field is
 * `StoredImage | null`: `Category.iconImage`, `Offer.bannerImage`,
 * `Setting.value` (store logo / favicon / OG default), etc.
 *
 * Persistence contract: the wrapper owns the value. We POST to
 * `/api/uploads` to obtain a fresh `StoredImage`, then call `onChange`
 * with the new value. The parent decides when (and how) to persist it
 * to the model.
 */

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, RefreshCcw, Trash2, ZoomIn } from "lucide-react";
import type { StoredImage } from "@store/shared";

import { Lightbox } from "./Lightbox";
import {
  collectStoredImageUrls,
  removeStoredUrls,
  uploadImage,
} from "./uploadClient";

type Aspect = "square" | "wide" | "free";

interface ImageUploadProps {
  value: StoredImage | null;
  onChange: (image: StoredImage | null) => void;
  /** Alt-text seed sent with the upload (e.g. `Phones category icon`). */
  altSeed?: string;
  /** Subject kind sent in the storage key prefix (e.g. `categories`). */
  subjectKind?: string;
  /** Subject id (e.g. category slug). Sanitised server-side. */
  subjectId?: string;
  /** Aspect-ratio hint for the dropzone preview only. */
  aspect?: Aspect;
  /** Optional helper line under the input (e.g. recommended size). */
  hint?: string;
  /** Optional label rendered above the dropzone. */
  label?: string;
}

const ASPECT_CLASS: Record<Aspect, string> = {
  square: "aspect-square",
  wide: "aspect-[16/9]",
  free: "aspect-[4/3]",
};

export function ImageUpload({
  value,
  onChange,
  altSeed,
  subjectKind,
  subjectId,
  aspect = "square",
  hint,
  label,
}: ImageUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const stored = await uploadImage({ file, altSeed, subjectKind, subjectId });
      if (value) {
        await removeStoredUrls(collectStoredImageUrls(value));
      }
      onChange(stored);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!value) return;
    setBusy(true);
    try {
      await removeStoredUrls(collectStoredImageUrls(value));
      onChange(null);
    } finally {
      setBusy(false);
    }
  }

  function handleAltChange(next: string) {
    if (!value) return;
    onChange({ ...value, alt: next });
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
        className="sr-only"
        disabled={busy}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {value ? (
        <div className="rounded-lg border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
          <div
            className={`relative overflow-hidden rounded-md bg-[var(--color-canvas-deep)] ${ASPECT_CLASS[aspect]}`}
          >
            <Image
              src={value.variants.card}
              alt={value.alt || "Uploaded image"}
              width={value.width}
              height={value.height}
              placeholder={value.blurDataURL ? "blur" : "empty"}
              blurDataURL={value.blurDataURL || undefined}
              className="size-full object-cover"
            />
            <button
              type="button"
              aria-label="Open preview"
              onClick={() => setLightboxOpen(true)}
              className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/60"
            >
              <ZoomIn size={14} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-ink-800)] hover:bg-[var(--color-canvas-deep)] disabled:opacity-60"
            >
              <RefreshCcw size={12} /> Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-rose-200)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-rose-700)] hover:bg-[var(--color-rose-50)] disabled:opacity-60"
            >
              <Trash2 size={12} /> Remove
            </button>
            <span className="ml-auto text-[11px] text-[var(--color-ink-500)]">
              {value.width}×{value.height}
            </span>
          </div>
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
            Alt text
            <input
              type="text"
              value={value.alt}
              onChange={(e) => handleAltChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2 py-1.5 text-[13px] font-normal text-[var(--color-ink-900)] focus:border-[var(--color-accent-500)] focus:outline-none"
              placeholder="Describe this image"
            />
          </label>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`group flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] p-6 text-[var(--color-ink-500)] transition hover:border-[var(--color-accent-400)] hover:text-[var(--color-accent-700)] disabled:opacity-60 ${ASPECT_CLASS[aspect]}`}
        >
          <ImagePlus size={20} />
          <span className="text-[12.5px] font-semibold">
            {busy ? "Uploading…" : "Click to upload"}
          </span>
          {hint && <span className="text-[11px]">{hint}</span>}
        </button>
      )}
      {error && (
        <p className="text-[12px] text-[var(--color-rose-700)]" role="alert">
          {error}
        </p>
      )}
      {lightboxOpen && value && (
        <Lightbox
          urls={[value.variants.full]}
          initialIndex={0}
          alt={value.alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
