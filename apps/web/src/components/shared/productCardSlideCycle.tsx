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
  resolveListingVariant,
  resolveVariantHeroImage,
  scopeProductToGrade,
} from "@/lib/productSummary";
import {
  useAttributesForCategory,
  useGradesForCategory,
} from "@/lib/storefront/storefrontReferenceContext";

import {
  OVERLAY_CHIP_ROW_MAX_PX,
  TITLE_CHIP_ROW_MAX_PX,
  flattenChipGroups,
  getAttributeChipGroups,
  type ProductCardMediaSlide,
} from "./productCardChipModel";
import { GroupedAttributeChipRow } from "./productCardChipRow";

const GRADE_CYCLE_MS = 4800;

export function buildProductCardGradeSlides(
  catalog: Product,
  attributes: ReturnType<typeof useAttributesForCategory>,
  categoryGrades: ReturnType<typeof useGradesForCategory>,
): ProductCardMediaSlide[] {
  const orderedGradeSlugs = getProductGradesInDisplayOrder(catalog, categoryGrades);
  return orderedGradeSlugs.map((gradeSlug) => {
    const scoped = scopeProductToGrade(catalog, gradeSlug);
    const displayVariant = resolveListingVariant(scoped);
    return {
      slideKey: gradeSlug,
      gradeSlug,
      heroImage: resolveVariantHeroImage(catalog, displayVariant),
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
  fixedHeroImage,
  priority = false,
}: {
  slides: ProductCardMediaSlide[];
  activeIndex: number;
  categorySlug: string;
  name: string;
  brandName: string;
  brandSlug: string;
  pinnedGradeSlug?: string;
  /** Browse-by-grade: grade gallery stays fixed while attributes cycle. */
  fixedHeroImage?: StoredImage;
  /**
   * Preload the first slide's hero (and `fixedHeroImage`) — used for
   * above-the-fold cards. We never set `priority` on more than one
   * underlying image at a time so the LCP budget isn't blown.
   */
  priority?: boolean;
}) {
  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <>
      {/* Hero image — stacked crossfade across slides. The wrapper keeps the
          hover zoom while the inner grid holds every slide layered in the
          same cell, so opacity transitions produce a true crossfade with
          no blank frame between slides. */}
      <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
        {fixedHeroImage ? (
          <div className="absolute inset-0">
            <ProductImage
              image={fixedHeroImage}
              variant="card"
              name={name}
              brandName={brandName}
              brandSlug={brandSlug}
              priority={priority}
            />
          </div>
        ) : (
          <div className="card-fade-stack absolute inset-0">
            {slides.map((slide, index) => (
              <div
                key={slide.slideKey}
                className={`card-fade-stack__layer ${
                  index === activeIndex ? "card-fade-stack__layer--active" : ""
                }`}
                aria-hidden={index !== activeIndex}
              >
                <ProductImage
                  image={slide.heroImage}
                  variant="card"
                  name={name}
                  brandName={brandName}
                  brandSlug={brandSlug}
                  // Only the first slide preloads. The rotating siblings
                  // ride the standard Next/Image lazy path so a single
                  // above-the-fold card never preloads N images.
                  priority={priority && index === 0}
                />
              </div>
            ))}
          </div>
        )}
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
        <div className="card-fade-stack absolute right-1.5 top-1.5 z-10 md:right-3 md:top-3">
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
