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
 *
 * Hero swap uses a two-layer cross-fade so the previous image stays
 * visible until the next one has fully decoded — no blank flash when
 * the visitor clicks a thumbnail or swipes.
 */

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

import type { Product, StoredImage } from "@store/shared";

import { ProductImage } from "@/components/shared/ProductImage";
import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";

/** Minimum horizontal distance for a touch gesture to register as a swipe. */
const SWIPE_THRESHOLD_PX = 40;
/** Maximum vertical drift before we treat a gesture as a scroll, not a swipe. */
const SWIPE_VERTICAL_TOLERANCE_PX = 60;

interface HeroSlot {
  key: string;
  image: StoredImage;
}

function makeHeroKey(galleryKey: string, image: StoredImage | undefined): string {
  return image ? `${galleryKey}:${image.variants.detail}` : `${galleryKey}:empty`;
}

interface SwipeHandlers {
  onTouchStart: (event: React.TouchEvent) => void;
  onTouchMove: (event: React.TouchEvent) => void;
  onTouchEnd: (event: React.TouchEvent) => void;
}

/** Detects a horizontal swipe and calls onNext/onPrev. Ignores vertical scrolls. */
function useHorizontalSwipe(onNext: () => void, onPrev: () => void): SwipeHandlers {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      startRef.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchMove: () => {
      // Nothing to do mid-gesture; we evaluate on touchend.
    },
    onTouchEnd: (event) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dy) > SWIPE_VERTICAL_TOLERANCE_PX) return;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (dx < 0) onNext();
      else onPrev();
    },
  };
}

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

  const safeIndex =
    images.length === 0 ? 0 : Math.min(activeIndex, images.length - 1);
  const hero = images[safeIndex] ?? images[0];
  const heroKey = makeHeroKey(galleryKey, hero);

  // Two-layer cross-fade: `displayed` stays visible (opacity 1) until
  // `incoming` finishes decoding. The transition end handler promotes
  // incoming → displayed and drops the second layer.
  const [displayed, setDisplayed] = useState<HeroSlot | null>(() =>
    hero ? { key: heroKey, image: hero } : null,
  );
  const [incoming, setIncoming] = useState<HeroSlot | null>(null);
  const [incomingReady, setIncomingReady] = useState(false);

  useEffect(() => {
    scheduleStateUpdate(() => {
      setActiveIndex(0);
      setLightboxOpen(false);
    });
  }, [galleryKey]);

  useEffect(() => {
    if (!hero) {
      scheduleStateUpdate(() => {
        setDisplayed(null);
        setIncoming(null);
        setIncomingReady(false);
      });
      return;
    }
    if (heroKey === displayed?.key) {
      // Already displaying this image (e.g. re-render with same hero).
      if (incoming) {
        scheduleStateUpdate(() => {
          setIncoming(null);
          setIncomingReady(false);
        });
      }
      return;
    }
    if (heroKey === incoming?.key) {
      return;
    }
    scheduleStateUpdate(() => {
      setIncoming({ key: heroKey, image: hero });
      setIncomingReady(false);
    });
  }, [hero, heroKey, displayed?.key, incoming]);

  const handleIncomingLoad = useCallback(() => {
    // Defer one frame so the browser paints the opacity-0 state first;
    // otherwise React can batch the load callback into the same paint
    // as the mount and we'd skip the transition entirely.
    requestAnimationFrame(() => {
      setIncomingReady(true);
    });
  }, []);

  const handleIncomingTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName !== "opacity") return;
      if (!incomingReady) return;
      setDisplayed((current) => incoming ?? current);
      setIncoming(null);
      setIncomingReady(false);
    },
    [incoming, incomingReady],
  );

  const go = useCallback(
    (delta: number) => {
      if (images.length === 0) return;
      setActiveIndex(
        (current) => (current + delta + images.length) % images.length,
      );
    },
    [images.length],
  );

  const heroSwipe = useHorizontalSwipe(
    useCallback(() => go(1), [go]),
    useCallback(() => go(-1), [go]),
  );

  const detailSizes =
    layout === "mobile"
      ? "(max-width: 768px) 92vw, 50vw"
      : "(max-width: 1024px) 50vw, 50vw";

  const heroLayers = (
    <>
      {displayed && (
        <div className="product-media-well absolute inset-0">
          <ProductImage
            key={displayed.key}
            image={displayed.image}
            variant="detail"
            name={name}
            brandName={brandName}
            brandSlug={brandSlug}
            sizes={detailSizes}
            priority
          />
        </div>
      )}
      {incoming && (
        <div
          className={
            "product-media-well absolute inset-0 transition-opacity duration-200 ease-out " +
            (incomingReady ? "opacity-100" : "opacity-0")
          }
          onTransitionEnd={handleIncomingTransitionEnd}
        >
          <ProductImage
            key={incoming.key}
            image={incoming.image}
            variant="detail"
            name={name}
            brandName={brandName}
            brandSlug={brandSlug}
            sizes={detailSizes}
            priority
            onLoadComplete={handleIncomingLoad}
          />
        </div>
      )}
    </>
  );

  if (layout === "mobile") {
    return (
      <>
        <button
          type="button"
          onClick={() => images.length > 0 && setLightboxOpen(true)}
          aria-label={hero ? `Open zoomed view of ${name}` : `${name} image`}
          className="product-media-well relative block aspect-square w-full touch-pan-y bg-[var(--color-canvas-deep)]"
          {...(images.length > 1 ? heroSwipe : {})}
        >
          {heroLayers}
          {hero && (
            <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[var(--color-ink-900)]/55 text-[var(--color-on-dark)] backdrop-blur">
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
            onNavigate={(next) => setActiveIndex(next)}
            showArrows
            onNext={() => go(1)}
            onPrev={() => go(-1)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => images.length > 0 && setLightboxOpen(true)}
        aria-label={hero ? `Open zoomed view of ${name}` : `${name} image`}
        className="product-media-well relative block aspect-square w-full touch-pan-y rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]"
        {...(images.length > 1 ? heroSwipe : {})}
      >
        {heroLayers}
        {hero && (
          <span className="pointer-events-none absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-full bg-[var(--color-ink-900)]/55 text-[var(--color-on-dark)] backdrop-blur">
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

  const goNext = useCallback(() => {
    if (images.length === 0) return;
    setIndex((i) => (i + 1) % images.length);
    onNext?.();
  }, [images.length, onNext]);

  const goPrev = useCallback(() => {
    if (images.length === 0) return;
    setIndex((i) => (i - 1 + images.length) % images.length);
    onPrev?.();
  }, [images.length, onPrev]);

  const lightboxSwipe = useHorizontalSwipe(goNext, goPrev);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    onNavigate?.(index);
  }, [index, onNavigate]);

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Zoom view of ${name}`}
      className="animate-sheet-fade fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-ink-900)]/90 p-4"
    >
      <button
        type="button"
        aria-label="Close zoom"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className="animate-lightbox-in relative max-h-[92vh] max-w-[92vw] touch-pan-y"
        {...(images.length > 1 ? lightboxSwipe : {})}
      >
        <Image
          src={
            image.variants.full ||
            image.variants.detail ||
            image.variants.card
          }
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
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-[var(--color-on-dark-15)] text-[var(--color-on-dark)] backdrop-blur hover:bg-[var(--color-on-dark-25)]"
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
              goPrev();
            }}
            className="absolute left-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-on-dark-15)] text-[var(--color-on-dark)] backdrop-blur hover:bg-[var(--color-on-dark-25)]"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-[var(--color-on-dark-15)] text-[var(--color-on-dark)] backdrop-blur hover:bg-[var(--color-on-dark-25)]"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-on-dark-15)] px-3 py-1 text-[12px] font-semibold text-[var(--color-on-dark)] backdrop-blur">
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
 * Server-component-friendly wrapper around `<PdpGallery>`. Images now live
 * at the product level, so the gallery no longer changes when the visitor
 * switches variants — the wrapper exists for compatibility with PDP call
 * sites that previously needed grade-scoped resolution.
 */
export function VariantAwareGallery({
  product,
  brandName,
  layout,
}: VariantAwareGalleryProps) {
  return (
    <PdpGallery
      galleryKey={product.id}
      images={product.images}
      name={product.name}
      brandName={brandName}
      brandSlug={product.brandSlug}
      layout={layout}
    />
  );
}
