"use client";

import { useEffect, useMemo, useState } from "react";

import { scheduleStateUpdate } from "@/lib/scheduleStateUpdate";
import { formatPrice, type Product, type StoredImage } from "@store/shared";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import {
  getProductGradesInDisplayOrder,
  getProductPriceRange,
  getVariantsInDisplayOrder,
  scopeProductToGrade,
} from "@/lib/productSummary";
import {
  useAttributesForCategory,
  useGradesForCategory,
} from "@/lib/core/storefrontReferenceContext";

import {
  OVERLAY_CHIP_ROW_MAX_PX,
  TITLE_CHIP_ROW_MAX_PX,
  flattenChipGroups,
  getAttributeChipGroups,
  type ProductCardMediaSlide,
} from "./productCardChipModel";
import { GroupedAttributeChipRow } from "./productCardChipRow";

const GRADE_CYCLE_MS = 2000;

export function buildProductCardGradeSlides(
  catalog: Product,
  attributes: ReturnType<typeof useAttributesForCategory>,
  categoryGrades: ReturnType<typeof useGradesForCategory>,
): ProductCardMediaSlide[] {
  // Hero stays static across grades now that images live on the product;
  // only the grade badge + chip rows cycle per grade.
  const orderedGradeSlugs = getProductGradesInDisplayOrder(catalog, categoryGrades);
  return orderedGradeSlugs.map((gradeSlug) => {
    const scoped = scopeProductToGrade(catalog, gradeSlug);
    return {
      slideKey: gradeSlug,
      gradeSlug,
      titleChipGroups: getAttributeChipGroups(scoped, attributes, "title-chips"),
      overlayChipGroups: getAttributeChipGroups(scoped, attributes, "image-overlay"),
    };
  });
}

export function buildProductCardVariantSlides(
  catalog: Product,
  variants: Product["variants"],
  attributes: ReturnType<typeof useAttributesForCategory>,
): ProductCardMediaSlide[] {
  return getVariantsInDisplayOrder(variants).map((variant) => {
    const scoped: Product = { ...catalog, variants: [variant] };
    return {
      slideKey: variant.id,
      titleChipGroups: getAttributeChipGroups(scoped, attributes, "title-chips"),
      overlayChipGroups: getAttributeChipGroups(scoped, attributes, "image-overlay"),
    };
  });
}

export function ProductCardMediaCycle({
  slides,
  activeIndex,
  categorySlug,
  name,
  brandName,
  brandSlug,
  pinnedGradeSlug,
  heroImage,
  priority = false,
}: {
  slides: ProductCardMediaSlide[];
  activeIndex: number;
  categorySlug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  pinnedGradeSlug?: string;
  /** Single product gallery hero shown beneath the cycling overlays. */
  heroImage?: StoredImage;
  /** Preload the hero — used for above-the-fold cards. */
  priority?: boolean;
}) {
  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <>
      {/* Hero stays static — images live at the product level, so the
          background never crossfades. Overlays (grade badge, attribute
          chips) keep cycling so each slide still has a distinct look. */}
      <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
        <ProductImage
          image={heroImage}
          variant="card"
          name={name}
          brandName={brandName}
          brandSlug={brandSlug}
          priority={priority}
        />
      </div>

      {/* Grade badge — when the badge follows the slide, stack every grade so
          we never flash between labels of different widths. When pinned (grade
          listing), just render the one badge. */}
      {pinnedGradeSlug ? (
        <div className="absolute right-1.5 top-1.5 z-10 md:right-3 md:top-3">
          <GradeBadge
            categorySlug={categorySlug}
            gradeSlug={pinnedGradeSlug}
            size="sm"
          />
        </div>
      ) : slides.some((slide) => slide.gradeSlug) ? (
        <div className="card-fade-stack absolute right-1.5 top-1.5 z-10 justify-items-end md:right-3 md:top-3">
          {slides.map((slide, index) =>
            slide.gradeSlug ? (
              <div
                key={slide.slideKey}
                className={`card-fade-stack__layer ${
                  index === activeIndex ? "card-fade-stack__layer--active" : ""
                }`}
                aria-hidden={index !== activeIndex}
              >
                <GradeBadge
                  categorySlug={categorySlug}
                  gradeSlug={slide.gradeSlug}
                  size="sm"
                />
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      {/* Overlay chips — same stacked crossfade. The container anchors at the
          bottom-left of the image well; each slide's chip row sits in its own
          grid cell layered on top. */}
      {slides.some((slide) => slide.overlayChipGroups.length > 0) ? (
        <div className="card-fade-stack absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-12px)] md:bottom-3 md:left-3">
          {slides.map((slide, index) =>
            slide.overlayChipGroups.length > 0 ? (
              <div
                key={slide.slideKey}
                className={`card-fade-stack__layer ${
                  index === activeIndex ? "card-fade-stack__layer--active" : ""
                }`}
                aria-hidden={index !== activeIndex}
              >
                <GroupedAttributeChipRow
                  groups={slide.overlayChipGroups}
                  maxHeightPx={OVERLAY_CHIP_ROW_MAX_PX}
                  variant="overlay"
                />
              </div>
            ) : null,
          )}
        </div>
      ) : null}

      <span className="sr-only" aria-live="polite">
        {activeSlide
          ? (() => {
              const labels = flattenChipGroups(activeSlide.titleChipGroups)
                .map((chip) => chip.label)
                .join(", ");
              return activeSlide.gradeSlug
                ? `${activeSlide.gradeSlug}: ${labels}`
                : labels;
            })()
          : null}
      </span>
    </>
  );
}

export function ProductCardPriceCycle({
  variants,
  activeIndex,
}: {
  variants: Product["variants"];
  activeIndex: number;
}) {
  // Stacked crossfade for the per-variant price so the line never blanks
  // between values. Grid layout sizes the container to the widest price so
  // the count chip on the right doesn't shift around as we cycle.
  return (
    <div className="card-fade-stack min-w-0 flex-1">
      {variants.map((variant, index) => (
        <p
          key={variant.id}
          className={`card-fade-stack__layer min-w-0 text-[14px] font-semibold leading-snug tracking-tight text-[var(--color-ink-900)] md:text-[16px] ${
            index === activeIndex ? "card-fade-stack__layer--active" : ""
          }`}
          aria-hidden={index !== activeIndex}
        >
          {formatVariantListingPrice(variant) ?? "Unavailable"}
        </p>
      ))}
    </div>
  );
}

export function ProductCardTitleChipCycle({
  slides,
  activeIndex,
}: {
  slides: ProductCardMediaSlide[];
  activeIndex: number;
}) {
  // Stacked crossfade inside the reserved chip slot (min-h-[2.25rem]). All
  // chip rows occupy the same grid cell so the row never collapses or jumps
  // between slides.
  return (
    <div className="card-fade-stack h-full w-full">
      {slides.map((slide, index) => (
        <div
          key={slide.slideKey}
          className={`card-fade-stack__layer ${
            index === activeIndex ? "card-fade-stack__layer--active" : ""
          }`}
          aria-hidden={index !== activeIndex}
        >
          <GroupedAttributeChipRow
            groups={slide.titleChipGroups}
            maxHeightPx={TITLE_CHIP_ROW_MAX_PX}
          />
        </div>
      ))}
    </div>
  );
}

export function useSlideCycle(slideCount: number, cycleKey: string, enabled: boolean) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const staggerMs = useMemo(
    () => hashCycleOffset(cycleKey, GRADE_CYCLE_MS),
    [cycleKey],
  );
  const shouldAnimate =
    enabled && !prefersReducedMotion && slideCount > 1 && !paused;

  useEffect(() => {
    scheduleStateUpdate(() => {
      setIndex(0);
    });
  }, [slideCount, cycleKey]);

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        setIndex((current) => (current + 1) % slideCount);
      }, GRADE_CYCLE_MS);
    }, staggerMs);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [shouldAnimate, slideCount, staggerMs]);

  return {
    activeIndex: prefersReducedMotion ? 0 : index,
    setPaused,
  };
}

function hashCycleOffset(seed: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash + seed.charCodeAt(index) * (index + 1)) % modulo;
  }
  return hash;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return prefersReducedMotion;
}

export function formatVariantListingPrice(
  variant: Product["variants"][number],
): string | null {
  if (variant.priceRupees <= 0) {
    return null;
  }
  return formatPrice(variant.priceRupees);
}

export function formatListingPrice(product: Product): string | null {
  const range = getProductPriceRange(product);
  if (!range) {
    return null;
  }
  if (range.min === range.max) {
    return formatPrice(range.min);
  }
  return `${formatPrice(range.min)} – ${formatPrice(range.max)}`;
}
