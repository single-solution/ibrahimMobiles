"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Award } from "lucide-react";

import {
  formatPrice,
  resolveVariantAttributeLabel,
  type Product,
  type StoredImage,
} from "@store/shared";
import { toAttributeLabelSource } from "@/lib/catalog/attributeLabels";
import { GRADE_DIMENSION_KEY } from "@/lib/catalog/pdpSelection";

import { ColoredPill } from "@/components/shared/ColoredPill";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { productHref } from "@/lib/catalog/productPaths";
import {
  countProductGrades,
  getDefaultVariant,
  getProductGradesInDisplayOrder,
  getProductPriceRange,
  getVariantsInDisplayOrder,
  isProductInStock,
  resolveListingVariant,
  resolveGradeListingHeroImage,
  resolveVariantHeroImage,
  scopeProductToGrade,
} from "@/lib/productSummary";
import {
  useAttributesForCategory,
  useGradesForCategory,
} from "@/lib/storefront/storefrontReferenceContext";

interface ProductCardProps {
  product: Product;
  /** Full product row (all grades) for catalog-wide price range in product view. */
  catalogProduct?: Product;
  /** Grade view: link opens PDP with this grade selected. */
  pinnedGradeSlug?: string;
}

interface AttributeChipModel {
  key: string;
  label: string;
  backgroundColor?: string;
}

interface AttributeChipGroup {
  attributeSlug: string;
  chips: AttributeChipModel[];
}

interface ProductCardMediaSlide {
  slideKey: string;
  heroImage?: StoredImage;
  titleChipGroups: AttributeChipGroup[];
  overlayChipGroups: AttributeChipGroup[];
  /** Product view — badge follows the active grade slide. */
  gradeSlug?: string;
}

const GRADE_CYCLE_MS = 4800;
/** Reserved chip row height — matches skeleton and empty cards. */
const CARD_CHIP_SLOT_CLASS = "min-h-[2.25rem] content-start pt-0.5";
const TITLE_CHIP_ROW_MAX_PX = 36;
const OVERLAY_CHIP_ROW_MAX_PX = 20;

interface ChipRowLayout {
  segmentCount: number;
  visibleCounts: number[];
}

/**
 * Compact storefront tile.
 *
 * Product view: one card per product, cycles grades when several exist.
 * Browse by grade: one card per grade, fixed grade image, variant attribute shuffle, per-variant price.
 */
export function ProductCard({
  product,
  catalogProduct,
  pinnedGradeSlug,
}: ProductCardProps) {
  const isGradeListing = Boolean(pinnedGradeSlug);
  const catalog = catalogProduct ?? product;
  const brandName = product.brandName ?? product.brandSlug;
  const displayVariant = resolveListingVariant(product);
  const defaultVariant = getDefaultVariant(catalog);
  const attributes = useAttributesForCategory(product.categorySlug);
  const categoryGrades = useGradesForCategory(product.categorySlug);
  const inStock = isProductInStock(isGradeListing ? product : catalog);
  const gradeCount = countProductGrades(catalog);
  const variantsInGradeCount = isGradeListing ? product.variants.length : 0;
  const showGradeCountChip = !isGradeListing && gradeCount > 1;
  const showVariantCountChip = isGradeListing && variantsInGradeCount > 1;
  const hasVariants = (isGradeListing ? product : catalog).variants.length > 0;
  const shouldCycleGrades = !isGradeListing && gradeCount > 1;
  const shouldCycleVariants = isGradeListing && variantsInGradeCount > 1;

  const gradeSlides = useMemo(() => {
    if (!shouldCycleGrades) {
      return null;
    }
    return buildProductCardGradeSlides(catalog, attributes, categoryGrades);
  }, [attributes, catalog, categoryGrades, shouldCycleGrades]);

  const variantSlides = useMemo(() => {
    if (!shouldCycleVariants) {
      return null;
    }
    return buildProductCardVariantSlides(catalog, product.variants, attributes);
  }, [attributes, catalog, product.variants, shouldCycleVariants]);

  const chipSlides = gradeSlides ?? variantSlides;
  const shouldCycleGradeMedia = Boolean(gradeSlides && gradeSlides.length > 1);
  const shouldCycleVariantChips = Boolean(variantSlides && variantSlides.length > 1);
  const cycleKey = isGradeListing
    ? `${catalog.id}:${pinnedGradeSlug ?? "grade"}`
    : catalog.id;

  const slideCycle = useSlideCycle(
    chipSlides?.length ?? 0,
    cycleKey,
    shouldCycleGradeMedia || shouldCycleVariantChips,
  );

  const orderedVariantsInGrade = useMemo(
    () => getVariantsInDisplayOrder(product.variants),
    [product.variants],
  );
  const listingVariant =
    isGradeListing && shouldCycleVariantChips
      ? (orderedVariantsInGrade[slideCycle.activeIndex] ?? displayVariant)
      : displayVariant;
  const href = isGradeListing
    ? productHref(catalog, {
        selection: { [GRADE_DIMENSION_KEY]: pinnedGradeSlug! },
        variant: listingVariant,
      })
    : productHref(catalog, { variant: getDefaultVariant(catalog) });

  const gradeListingHeroImage =
    isGradeListing && pinnedGradeSlug
      ? resolveGradeListingHeroImage(catalog, pinnedGradeSlug)
      : undefined;
  const priceLabel = isGradeListing
    ? formatVariantListingPrice(listingVariant)
    : formatListingPrice(catalog);

  const attributeSource = isGradeListing ? product : catalog;
  const staticHeroImage =
    gradeListingHeroImage ??
    resolveVariantHeroImage(product, displayVariant) ??
    resolveVariantHeroImage(catalog, defaultVariant);
  const staticTitleChipGroups = getAttributeChipGroups(
    attributeSource,
    attributes,
    "title-chips",
  );
  const staticOverlayChipGroups = getAttributeChipGroups(
    attributeSource,
    attributes,
    "image-overlay",
  );
  const staticGradeSlug = isGradeListing
    ? pinnedGradeSlug!
    : displayVariant.gradeSlug;

  return (
    <Link
      href={href}
      className="group block h-full focus:outline-none"
      onMouseEnter={() => slideCycle.setPaused(true)}
      onMouseLeave={() => slideCycle.setPaused(false)}
      onFocus={() => slideCycle.setPaused(true)}
      onBlur={() => slideCycle.setPaused(false)}
    >
      <div className="lift flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-ink-200)]">
        <div className="product-media-well relative aspect-[5/4] bg-[var(--color-canvas-deep)]">
          {shouldCycleGradeMedia && gradeSlides ? (
            <ProductCardMediaCycle
              activeIndex={slideCycle.activeIndex}
              brandName={brandName}
              brandSlug={product.brandSlug}
              categorySlug={product.categorySlug}
              name={product.name}
              slides={gradeSlides}
            />
          ) : isGradeListing && shouldCycleVariantChips && variantSlides ? (
            <ProductCardMediaCycle
              activeIndex={slideCycle.activeIndex}
              brandName={brandName}
              brandSlug={product.brandSlug}
              categorySlug={product.categorySlug}
              fixedHeroImage={gradeListingHeroImage}
              name={product.name}
              pinnedGradeSlug={pinnedGradeSlug}
              slides={variantSlides}
            />
          ) : (
            <>
              <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
                <ProductImage
                  image={staticHeroImage}
                  variant="card"
                  name={product.name}
                  brandName={brandName}
                  brandSlug={product.brandSlug}
                />
              </div>
              <div className="absolute right-1.5 top-1.5 z-10 flex flex-col items-end gap-1 md:right-3 md:top-3 md:gap-1.5">
                <GradeBadge
                  categorySlug={product.categorySlug}
                  gradeSlug={staticGradeSlug}
                  size="sm"
                />
              </div>
              {staticOverlayChipGroups.length > 0 && (
                <div className="absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-12px)] md:bottom-3 md:left-3">
                  <GroupedAttributeChipRow
                    groups={staticOverlayChipGroups}
                    maxHeightPx={OVERLAY_CHIP_ROW_MAX_PX}
                    variant="overlay"
                  />
                </div>
              )}
            </>
          )}

          {(!hasVariants || !inStock) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]">
              <span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] md:px-4 md:py-1.5 md:text-[11px]">
                {hasVariants ? "Sold out" : "Unavailable"}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col gap-1 p-2 md:gap-1.5 md:p-2.5">
            <div className="space-y-0.5">
              <span className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                {brandName}
              </span>
              <h3 className="line-clamp-1 text-[13px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] md:text-[15px]">
                {product.name}
              </h3>
            </div>
            <div className={CARD_CHIP_SLOT_CLASS}>
              {shouldCycleVariantChips && variantSlides ? (
                <ProductCardTitleChipCycle
                  activeIndex={slideCycle.activeIndex}
                  slides={variantSlides}
                />
              ) : shouldCycleGradeMedia && gradeSlides ? (
                <ProductCardTitleChipCycle
                  activeIndex={slideCycle.activeIndex}
                  slides={gradeSlides}
                />
              ) : (
                <GroupedAttributeChipRow
                  groups={staticTitleChipGroups}
                  maxHeightPx={TITLE_CHIP_ROW_MAX_PX}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-2 py-1.5 md:px-2.5 md:py-2">
            <p
              key={
                isGradeListing && shouldCycleVariantChips
                  ? listingVariant.id
                  : "listing-price"
              }
              className={`min-w-0 text-[14px] font-semibold leading-snug tracking-tight text-[var(--color-ink-900)] md:text-[16px] ${
                isGradeListing && shouldCycleVariantChips ? "card-grade-fade" : ""
              }`}
            >
              {priceLabel ?? "Unavailable"}
            </p>
            {showGradeCountChip && (
              <ProductListingCountChip
                label={`${gradeCount} ${gradeCount === 1 ? "grade" : "grades"}`}
              />
            )}
            {showVariantCountChip && (
              <ProductListingCountChip
                label={`${variantsInGradeCount} ${variantsInGradeCount === 1 ? "variant" : "variants"}`}
              />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function buildProductCardGradeSlides(
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

function buildProductCardVariantSlides(
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

function ProductCardMediaCycle({
  slides,
  activeIndex,
  categorySlug,
  name,
  brandName,
  brandSlug,
  pinnedGradeSlug,
  fixedHeroImage,
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
}) {
  const activeSlide = slides[activeIndex] ?? slides[0];
  const badgeGradeSlug = pinnedGradeSlug ?? activeSlide.gradeSlug ?? "";
  const heroImage = fixedHeroImage ?? activeSlide.heroImage;
  const imageKey = fixedHeroImage ? "grade-fixed-hero" : activeSlide.slideKey;

  return (
    <>
      <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
        <div
          key={imageKey}
          className={
            fixedHeroImage
              ? "absolute inset-0"
              : "card-grade-fade-image absolute inset-0"
          }
        >
          <ProductImage
            image={heroImage}
            variant="card"
            name={name}
            brandName={brandName}
            brandSlug={brandSlug}
          />
        </div>
      </div>

      {badgeGradeSlug ? (
        <div className="absolute right-1.5 top-1.5 z-10 md:right-3 md:top-3">
          <div
            key={pinnedGradeSlug ? pinnedGradeSlug : activeSlide.slideKey}
            className={pinnedGradeSlug ? undefined : "card-grade-fade"}
          >
            <GradeBadge
              categorySlug={categorySlug}
              gradeSlug={badgeGradeSlug}
              size="sm"
            />
          </div>
        </div>
      ) : null}

      {activeSlide.overlayChipGroups.length > 0 && (
        <div className="absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-12px)] md:bottom-3 md:left-3">
          <div key={activeSlide.slideKey} className="card-grade-fade">
            <GroupedAttributeChipRow
              groups={activeSlide.overlayChipGroups}
              maxHeightPx={OVERLAY_CHIP_ROW_MAX_PX}
              variant="overlay"
            />
          </div>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {slides
          .map((slide) => {
            const labels = flattenChipGroups(slide.titleChipGroups)
              .map((chip) => chip.label)
              .join(", ");
            return slide.gradeSlug ? `${slide.gradeSlug}: ${labels}` : labels;
          })
          .join("; ")}
      </span>
    </>
  );
}

function ProductCardTitleChipCycle({
  slides,
  activeIndex,
}: {
  slides: ProductCardMediaSlide[];
  activeIndex: number;
}) {
  const activeSlide = slides[activeIndex] ?? slides[0];

  return (
    <div key={activeSlide.slideKey} className="card-grade-fade">
      <GroupedAttributeChipRow
        groups={activeSlide.titleChipGroups}
        maxHeightPx={TITLE_CHIP_ROW_MAX_PX}
      />
    </div>
  );
}

function useSlideCycle(slideCount: number, cycleKey: string, enabled: boolean) {
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
    setIndex(0);
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

function formatVariantListingPrice(
  variant: Product["variants"][number],
): string | null {
  if (variant.priceRupees <= 0) {
    return null;
  }
  return formatPrice(variant.priceRupees);
}

function formatListingPrice(product: Product): string | null {
  const range = getProductPriceRange(product);
  if (!range) {
    return null;
  }
  if (range.min === range.max) {
    return formatPrice(range.min);
  }
  return `${formatPrice(range.min)} – ${formatPrice(range.max)}`;
}

function getAttributeChipGroups(
  product: Product,
  attributes: ReturnType<typeof useAttributesForCategory>,
  cardPosition: "image-overlay" | "title-chips",
): AttributeChipGroup[] {
  const groups: AttributeChipGroup[] = [];
  const positioned = attributes.filter(
    (attribute) => attribute.cardPosition === cardPosition,
  );

  for (const attribute of positioned) {
    const valueMeta = new Map<
      string,
      { label: string; backgroundColor?: string }
    >();

    for (const variant of product.variants) {
      const raw = variant.attributes[attribute.slug];
      if (!raw) {
        continue;
      }
      const optionValues = Array.isArray(raw) ? raw : [raw];
      const display = variant.attributeDisplay ?? {};
      const source = toAttributeLabelSource(attribute);

      for (const value of optionValues) {
        if (valueMeta.has(value)) {
          continue;
        }
        valueMeta.set(value, {
          label: resolveVariantAttributeLabel(source, value, display),
          backgroundColor: attribute.options.find(
            (candidate) => candidate.value === value,
          )?.backgroundColor,
        });
      }
    }

    if (valueMeta.size === 0) {
      continue;
    }

    const chips: AttributeChipModel[] = [];
    const knownValues = new Set<string>();
    for (const option of attribute.options) {
      const meta = valueMeta.get(option.value);
      if (!meta) {
        continue;
      }
      knownValues.add(option.value);
      chips.push({
        key: `${attribute.slug}:${option.value}`,
        label: meta.label,
        backgroundColor: meta.backgroundColor,
      });
    }

    for (const [value, meta] of valueMeta) {
      if (knownValues.has(value)) {
        continue;
      }
      chips.push({
        key: `${attribute.slug}:${value}`,
        label: meta.label,
        backgroundColor: meta.backgroundColor,
      });
    }

    if (chips.length > 0) {
      groups.push({ attributeSlug: attribute.slug, chips });
    }
  }

  return groups;
}

function flattenChipGroups(groups: AttributeChipGroup[]): AttributeChipModel[] {
  return groups.flatMap((group) => group.chips);
}


interface AttributeGroupSegment {
  attributeSlug: string;
  allChips: AttributeChipModel[];
}

function isColorChipGroup(chips: AttributeChipModel[]): boolean {
  return chips.some((chip) => Boolean(chip.backgroundColor));
}

function expandAttributeGroup(group: AttributeChipGroup): AttributeGroupSegment {
  return {
    attributeSlug: group.attributeSlug,
    allChips: group.chips,
  };
}

function createFullChipRowLayout(segments: AttributeGroupSegment[]): ChipRowLayout {
  return {
    segmentCount: segments.length,
    visibleCounts: segments.map((segment) => segment.allChips.length),
  };
}

function shrinkChipRowLayout(layout: ChipRowLayout): ChipRowLayout | null {
  if (layout.segmentCount <= 0) {
    return null;
  }

  // Prefer trimming the widest attribute pill so other attribute groups stay visible.
  let shrinkIndex = -1;
  let maxVisible = 1;
  for (let index = 0; index < layout.segmentCount; index += 1) {
    const visible = layout.visibleCounts[index] ?? 1;
    if (visible > maxVisible) {
      maxVisible = visible;
      shrinkIndex = index;
    }
  }

  if (shrinkIndex >= 0 && maxVisible > 1) {
    const visibleCounts = [...layout.visibleCounts];
    visibleCounts[shrinkIndex] = maxVisible - 1;
    return { ...layout, visibleCounts };
  }

  // Every visible group is down to one value (+N more in-pill) — drop trailing groups last.
  if (layout.segmentCount > 1) {
    return {
      segmentCount: layout.segmentCount - 1,
      visibleCounts: layout.visibleCounts.slice(0, layout.segmentCount - 1),
    };
  }

  return null;
}

function buildAttributeGroupSegments(
  groups: AttributeChipGroup[],
): AttributeGroupSegment[] {
  return groups
    .map((group) => expandAttributeGroup(group))
    .filter((segment) => segment.allChips.length > 0);
}

function GroupedAttributeChipRow({
  groups,
  maxHeightPx,
  variant = "title",
}: {
  groups: AttributeChipGroup[];
  maxHeightPx: number;
  variant?: "title" | "overlay";
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = useMemo(() => buildAttributeGroupSegments(groups), [groups]);
  const [layout, setLayout] = useState<ChipRowLayout>(() =>
    createFullChipRowLayout(segments),
  );

  useLayoutEffect(() => {
    setLayout(createFullChipRowLayout(segments));
  }, [segments]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setLayout(createFullChipRowLayout(segments));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [segments]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || segments.length === 0) {
      return;
    }
    if (container.scrollHeight <= maxHeightPx + 1) {
      return;
    }

    setLayout((current) => shrinkChipRowLayout(current) ?? current);
  }, [layout, maxHeightPx, segments.length]);

  if (segments.length === 0) {
    return null;
  }

  const visibleSegments = segments.slice(0, layout.segmentCount);
  const rowOverflowChips = segments
    .slice(layout.segmentCount)
    .flatMap((segment) => segment.allChips);
  const lastVisibleIndex = visibleSegments.length - 1;
  const mergeRowOverflowIntoLast =
    rowOverflowChips.length > 0 && lastVisibleIndex >= 0;

  return (
    <div
      ref={containerRef}
      className="flex min-w-0 flex-wrap items-center gap-1 overflow-hidden"
      style={{ maxHeight: maxHeightPx }}
    >
      {visibleSegments.map((segment, index) => {
        const visibleCount = layout.visibleCounts[index] ?? segment.allChips.length;
        const segmentHidden = segment.allChips.slice(visibleCount);
        const mergeOverflow = mergeRowOverflowIntoLast && index === lastVisibleIndex;
        const visible = segment.allChips.slice(0, visibleCount);
        const hidden = mergeOverflow
          ? [...segmentHidden, ...rowOverflowChips]
          : segmentHidden;
        const allChips = mergeOverflow
          ? [...segment.allChips, ...rowOverflowChips]
          : segment.allChips;

        return (
          <AttributeGroupPill
            key={segment.attributeSlug}
            visible={visible}
            hidden={hidden}
            allChips={allChips}
            variant={variant}
          />
        );
      })}
    </div>
  );
}

function formatGroupPillLabel(
  visible: AttributeChipModel[],
  hiddenCount: number,
): string {
  if (visible.length === 0) {
    return `+${hiddenCount} more`;
  }
  const shown = visible.map((chip) => chip.label).join(", ");
  if (hiddenCount === 0) {
    return shown;
  }
  return `${shown} +${hiddenCount} more`;
}

function AttributeGroupPill({
  visible,
  hidden,
  allChips,
  variant = "title",
}: {
  visible: AttributeChipModel[];
  hidden: AttributeChipModel[];
  allChips: AttributeChipModel[];
  variant?: "title" | "overlay";
}) {
  const hiddenCount = hidden.length;
  if (visible.length === 0 && hiddenCount === 0) {
    return null;
  }

  const label = formatGroupPillLabel(visible, hiddenCount);
  const pillClass =
    "inline-flex max-w-full items-center truncate rounded-full border px-1.5 py-0.5 text-[10px] font-semibold shadow-sm backdrop-blur md:px-2 md:text-[11px]";
  const neutralClass =
    variant === "overlay"
      ? `${pillClass} border-black/10 bg-[var(--color-surface)]/95 text-[var(--color-ink-900)]`
      : `${pillClass} border-black/5 bg-[var(--color-surface)]/90 text-[var(--color-ink-800)]`;
  const accentColor =
    visible.find((chip) => chip.backgroundColor)?.backgroundColor ??
    allChips.find((chip) => chip.backgroundColor)?.backgroundColor;
  const useColorPill = Boolean(accentColor) && isColorChipGroup(allChips);
  const title = allChips.map((chip) => chip.label).join(", ");

  if (useColorPill && accentColor) {
    return (
      <span title={title} className="inline-flex max-w-full min-w-0">
        <ColoredPill
          backgroundColor={accentColor}
          className={`${pillClass} border-transparent`}
        >
          {label}
        </ColoredPill>
      </span>
    );
  }

  return (
    <span className={neutralClass} title={title}>
      {label}
    </span>
  );
}

function ProductListingCountChip({
  label,
}: {
  label: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-[58%] flex-wrap items-center justify-end gap-x-1 gap-y-0.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium leading-tight text-[var(--color-ink-700)] md:max-w-none md:gap-1 md:px-2 md:py-0.5 md:text-[11px]">
      <Award size={9} className="shrink-0 md:size-[11px]" aria-hidden />
      <span className="min-w-0">{label}</span>
    </span>
  );
}
