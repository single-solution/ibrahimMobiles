"use client";

/**
 * Variant-aware PDP gallery. Renders the hero image at `detail` size,
 * a thumb strip at `thumb` size, and opens a lightbox on click/zoom.
 *
 * Schema awareness (Phase 1, PLAN.md §10):
 *   - All images are `StoredImage` records carrying four pre-rendered
 *     WebP variants + a base64 blurhash. The gallery picks the right
 *     variant per surface so the CDN-served bytes stay ≤200 KB on
 *     mobile and ≤350 KB on desktop above the fold.
 *   - The component is memoised on the variant id passed in by the
 *     parent — unrelated PDP re-renders (e.g. quantity changes) won't
 *     re-render the gallery tree.
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

import type { Product, StoredImage } from "@store/shared";
import { imagesForProductGrade } from "@store/shared";

import { ProductImage } from "@/components/shared/ProductImage";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { useGalleryGradeSlug } from "@/components/shared/VariantContext";

interface PdpGalleryProps {
  /** Stable identity per grade — drives the memo + thumb-strip reset. */
  galleryKey: string;
  images: StoredImage[];
  name: string;
  brandName: string;
  brandSlug: string;
  /** "mobile" = full-bleed square, "desktop" = rounded with thumb grid. */
  layout: "mobile" | "desktop";
}

function PdpGalleryInner({
  galleryKey,
  images,
  name,
  brandName,
  brandSlug,
  layout,
}: PdpGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [readyHeroKey, setReadyHeroKey] = useState<string | null>(null);

  const safeIndex =
    images.length === 0 ? 0 : Math.min(activeIndex, images.length - 1);
  const hero = images[safeIndex] ?? images[0];
  const heroKey = hero
    ? `${galleryKey}:${hero.variants.detail}`
    : `${galleryKey}:empty`;
  const heroReady = readyHeroKey === null || readyHeroKey === heroKey;
  const heroVisibilityClass = heroReady ? "opacity-100" : "opacity-0";

  useEffect(() => {
    scheduleStateUpdate(() => {
      setActiveIndex(0);
      setLightboxOpen(false);
    });
  }, [galleryKey]);

  useEffect(() => {
    if (images.length === 0) {
      scheduleStateUpdate(() => {
        setReadyHeroKey(heroKey);
      });
    }
  }, [heroKey, images.length]);

  const handleHeroLoad = useCallback(() => {
    setReadyHeroKey(heroKey);
  }, [heroKey]);

  function go(delta: number) {
    if (images.length === 0) return;
    setActiveIndex(
      (current) => (current + delta + images.length) % images.length,
    );
  }

  if (layout === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => images.length > 0 && setLightboxOpen(true)}
          aria-label={hero ? `Open zoomed view of ${name}` : `${name} image`}
          className="product-media-well relative block aspect-square w-full bg-[var(--color-canvas-deep)]"
        >
          <div
            className={`product-media-well absolute inset-0 transition-none ${heroVisibilityClass}`}
          >
            <ProductImage
              key={heroKey}
              image={hero}
              variant="detail"
              name={name}
              brandName={brandName}
              brandSlug={brandSlug}
              sizes="(max-width: 768px) 92vw, 50vw"
              priority
              onLoadComplete={handleHeroLoad}
            />
          </div>
          {hero && heroReady && (
            <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[var(--color-ink-900)]/55 text-white backdrop-blur">
              <ZoomIn size={16} />
            </span>
          )}
        </button>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
            {images.slice(0, 8).map((image, index) => (
              <button
                key={`${image.variants.thumb}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === activeIndex}
                className={
                  "product-media-well relative aspect-square w-24 shrink-0 rounded-md border bg-[var(--color-canvas-deep)] transition-colors " +
                  (index === activeIndex
                    ? "border-[var(--color-ink-900)]"
                    : "border-[var(--color-ink-100)] hover:border-[var(--color-ink-300)]")
                }
              >
                <ProductImage
                  image={image}
                  variant="thumb"
                  name={name}
                  brandName={brandName}
                  brandSlug={brandSlug}
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        )}
        {lightboxOpen && (
          <Lightbox
            images={images}
            initialIndex={activeIndex}
            name={name}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <button
        type="button"
        onClick={() => images.length > 0 && setLightboxOpen(true)}
        aria-label={hero ? `Open zoomed view of ${name}` : `${name} image`}
        className="product-media-well relative block min-h-0 w-full flex-1 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
      >
        <div
          className={`product-media-well absolute inset-0 transition-none ${heroVisibilityClass}`}
        >
          <ProductImage
            key={heroKey}
            image={hero}
            variant="detail"
            name={name}
            brandName={brandName}
            brandSlug={brandSlug}
            sizes="(max-width: 1024px) 50vw, 50vw"
            priority
            onLoadComplete={handleHeroLoad}
          />
        </div>
        {hero && heroReady && (
          <span className="pointer-events-none absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-[var(--color-ink-900)]/55 text-white backdrop-blur">
            <ZoomIn size={16} />
          </span>
        )}
      </button>
      {images.length > 1 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto no-scrollbar">
          {images.slice(0, 8).map((image, index) => (
            <button
              key={`${image.variants.thumb}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Photo ${index + 1}`}
              aria-pressed={index === activeIndex}
              className={
                "product-media-well relative aspect-square w-24 shrink-0 rounded-[var(--radius-sm)] border bg-[var(--color-canvas-deep)] transition-colors " +
                (index === activeIndex
                  ? "border-[var(--color-ink-900)]"
                  : "border-[var(--color-ink-100)] hover:border-[var(--color-ink-300)]")
              }
            >
              <ProductImage
                image={image}
                variant="thumb"
                name={name}
                brandName={brandName}
                brandSlug={brandSlug}
                sizes="96px"
              />
            </button>
          ))}
        </div>
      )}
      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={activeIndex}
          name={name}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(next) => {
            setActiveIndex(next);
          }}
          showArrows
          onNext={() => go(1)}
          onPrev={() => go(-1)}
        />
      )}
    </div>
  );
}

interface LightboxProps {
  images: StoredImage[];
  initialIndex: number;
  name: string;
  onClose: () => void;
  onNavigate?: (index: number) => void;
  showArrows?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
}

function Lightbox({
  images,
  initialIndex,
  name,
  onClose,
  onNavigate,
  showArrows,
  onNext,
  onPrev,
}: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const image = images[index];

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        if (images.length === 0) return;
        setIndex((i) => (i + 1) % images.length);
        onNext?.();
      }
      if (event.key === "ArrowLeft") {
        if (images.length === 0) return;
        setIndex((i) => (i - 1 + images.length) % images.length);
        onPrev?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [images.length, onClose, onNext, onPrev]);

  useEffect(() => {
    onNavigate?.(index);
  }, [index, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Zoom view of ${name}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-ink-900)]/90 p-4"
    >
      <button
        type="button"
        aria-label="Close zoom"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative max-h-[92vh] max-w-[92vw]">
        <Image
          src={image.variants.full}
          alt={image.alt || name}
          width={image.width}
          height={image.height}
          sizes="100vw"
          placeholder={image.blurDataURL ? "blur" : undefined}
          blurDataURL={image.blurDataURL || undefined}
          className="max-h-[92vh] max-w-[92vw] object-contain"
        />
      </div>
      <button
        type="button"
        aria-label="Close zoom"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
      >
        <X size={18} />
      </button>
      {showArrows && images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">
        {index + 1} / {images.length}
      </p>
    </div>
  );
}

export const PdpGallery = memo(
  PdpGalleryInner,
  (prev, next) =>
    prev.galleryKey === next.galleryKey &&
    prev.layout === next.layout &&
    prev.images === next.images &&
    prev.name === next.name &&
    prev.brandName === next.brandName &&
    prev.brandSlug === next.brandSlug,
);

interface VariantAwareGalleryProps {
  product: Product;
  brandName: string;
  layout: "mobile" | "desktop";
}

/**
 * Server-component-friendly wrapper. Reads the currently selected
 * variant from `VariantContext` and feeds the right image stack into
 * `<PdpGallery>` — variant switches trigger the memoised gallery to
 * re-render with the new images.
 */
export function VariantAwareGallery({
  product,
  brandName,
  layout,
}: VariantAwareGalleryProps) {
  const galleryGradeSlug = useGalleryGradeSlug();
  const galleryImages = useMemo(
    () =>
      imagesForProductGrade(
        galleryGradeSlug,
        product.gradeImages,
        product.variants,
      ),
    [galleryGradeSlug, product.gradeImages, product.variants],
  );
  return (
    <div className={layout === "desktop" ? "h-full min-h-0" : undefined}>
      <PdpGallery
        key={galleryGradeSlug}
        galleryKey={galleryGradeSlug}
        images={galleryImages}
        name={product.name}
        brandName={brandName}
        brandSlug={product.brandSlug}
        layout={layout}
      />
    </div>
  );
}
