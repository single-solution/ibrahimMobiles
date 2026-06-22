"use client";

import { useMemo } from "react";
import Link from "next/link";

import { type Product } from "@store/shared";
import { GradeBadge } from "@/components/shared/GradeBadge";
import { ProductImage } from "@/components/shared/ProductImage";
import { productHref } from "@/lib/catalog/productPaths";
import { usePrefetchOnIntent } from "@/lib/navigation/usePrefetchOnIntent";
import { useActiveOffers } from "@/lib/pricing/useActiveOffers";
import { resolveProductItemScopedOffers } from "@/lib/pricing/productOfferMatch";
import { countProductGrades, getVariantsInDisplayOrder, isProductInStock, resolveListingVariant, resolveProductHeroImage, scopeProductToGrade } from "@/lib/productSummary";
import { useAttributesForCategory, useGradesForCategory } from "@/lib/core/storefrontReferenceContext";

import { ProductDealAvailableBadge } from "./ProductDealAvailableBadge";
import { CARD_FOOTER_CHIP_SLOT_CLASS, OVERLAY_CHIP_ROW_MAX_PX, TITLE_CHIP_ROW_MAX_PX, getAttributeChipGroups } from "./productCardChipModel";
import { GroupedAttributeChipRow } from "./productCardChipRow";
import { ProductListingCountChip } from "./productCardCountChip";
import { ProductCardMediaCycle, ProductCardTitleChipCycle, buildProductCardGradeSlides, buildProductCardVariantSlides, useSlideCycle } from "./productCardSlideCycle";

interface ProductCardProps {
	product: Product;
	/** Full product row (all grades) for catalog-wide price range in product view. */
	catalogProduct?: Product;
	/** Grade view: card copy scoped to this grade; link is always the base PDP URL. */
	pinnedGradeSlug?: string;
	/**
	 * When `true` the hero image renders as a `priority` `<Image>` so the
	 * browser preloads it as a high-priority resource and skips the lazy
	 * loader. Use for above-the-fold cards (first row in the shop grid /
	 * featured rails) to claim a strong LCP — keep `false` for the rest.
	 */
	priority?: boolean;
}

export function ProductCard({ product, catalogProduct, pinnedGradeSlug, priority = false }: ProductCardProps) {
	const isGradeListing = Boolean(pinnedGradeSlug);
	const catalog = catalogProduct ?? product;
	const brandName = product.brandName ?? product.brandSlug;
	const displayVariant = resolveListingVariant(product);
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
	const cycleKey = isGradeListing ? `${catalog.id}:${pinnedGradeSlug ?? "grade"}` : catalog.id;

	const slideCycle = useSlideCycle(chipSlides?.length ?? 0, cycleKey, shouldCycleGradeMedia || shouldCycleVariantChips);

	const orderedVariantsInGrade = useMemo(() => getVariantsInDisplayOrder(product.variants), [product.variants]);
	const listingVariant = isGradeListing && shouldCycleVariantChips ? (orderedVariantsInGrade[slideCycle.activeIndex] ?? displayVariant) : displayVariant;
	const href = productHref(catalog);

	const attributeSource = isGradeListing ? product : catalog;
	const productHeroImage = resolveProductHeroImage(catalog) ?? resolveProductHeroImage(product);
	const staticTitleChipGroups = getAttributeChipGroups(attributeSource, attributes, "title-chips");
	const staticOverlayChipGroups = getAttributeChipGroups(attributeSource, attributes, "image-overlay");
	const staticGradeSlug = isGradeListing ? pinnedGradeSlug! : displayVariant.gradeSlug;

	const prefetchHandlers = usePrefetchOnIntent(href);

	const { offers } = useActiveOffers();

	const applicableOfferCount = useMemo(() => {
		if (offers.length === 0 || !inStock) {
			return 0;
		}
		return resolveProductItemScopedOffers(catalog, offers).length;
	}, [catalog, inStock, offers]);

	return (
		<Link
			href={href}
			className="group block h-full focus:outline-none"
			onMouseEnter={() => slideCycle.setPaused(true)}
			onMouseLeave={() => slideCycle.setPaused(false)}
			onBlur={() => slideCycle.setPaused(false)}
			onPointerDown={prefetchHandlers.onPointerDown}
			onTouchStart={prefetchHandlers.onTouchStart}
			onFocus={() => {
				slideCycle.setPaused(true);
				prefetchHandlers.onFocus?.();
			}}
		>
			<div className="lift glass-shine flex h-full flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:border-[var(--color-ink-200)]">
				<div className="product-media-well relative aspect-square shrink-0 bg-[var(--color-canvas-deep)]">
					{shouldCycleGradeMedia && gradeSlides ? (
						<ProductCardMediaCycle
							activeIndex={slideCycle.activeIndex}
							brandName={brandName}
							brandSlug={product.brandSlug}
							categorySlug={product.categorySlug}
							heroImage={productHeroImage}
							name={product.name}
							slides={gradeSlides}
							priority={priority}
							offerCount={applicableOfferCount}
						/>
					) : isGradeListing && shouldCycleVariantChips && variantSlides ? (
						<ProductCardMediaCycle
							activeIndex={slideCycle.activeIndex}
							brandName={brandName}
							brandSlug={product.brandSlug}
							categorySlug={product.categorySlug}
							heroImage={productHeroImage}
							name={product.name}
							pinnedGradeSlug={pinnedGradeSlug}
							slides={variantSlides}
							priority={priority}
							offerCount={applicableOfferCount}
						/>
					) : (
						<>
							<div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
								<ProductImage image={productHeroImage} variant="card" name={product.name} brandName={brandName} brandSlug={product.brandSlug} priority={priority} />
							</div>
							<div className="absolute right-1.5 top-1.5 z-10 md:right-3 md:top-3">
								<GradeBadge categorySlug={product.categorySlug} gradeSlug={staticGradeSlug} size="sm" />
							</div>
							{applicableOfferCount > 0 ? (
								<div className="absolute left-1.5 top-1.5 z-10 md:left-3 md:top-3">
									<ProductDealAvailableBadge offerCount={applicableOfferCount} />
								</div>
							) : null}
							{staticOverlayChipGroups.length > 0 && (
								<div className="absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-12px)] md:bottom-3 md:left-3">
									<GroupedAttributeChipRow groups={staticOverlayChipGroups} maxHeightPx={OVERLAY_CHIP_ROW_MAX_PX} variant="overlay" />
								</div>
							)}
						</>
					)}

					{(!hasVariants || !inStock) && (
						<div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-ink-900)]/55">
							<span className="rounded-[var(--radius-full)] bg-[var(--color-surface)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-900)] shadow-[var(--shadow-md)] md:px-4 md:py-1.5 md:text-[11px]">
								{hasVariants ? "Sold out" : "Unavailable"}
							</span>
						</div>
					)}
				</div>

				<div className="flex flex-1 flex-col">
					<div className="flex flex-1 flex-col gap-1 p-2 md:gap-1.5 md:p-2.5">
						<div className="space-y-0.5">
							<div className="flex items-center justify-between gap-2">
								<span className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">{brandName}</span>
								{showGradeCountChip && <ProductListingCountChip label={`${gradeCount} ${gradeCount === 1 ? "grade" : "grades"} available`} />}
								{showVariantCountChip && <ProductListingCountChip label={`${variantsInGradeCount} ${variantsInGradeCount === 1 ? "variant" : "variants"} available`} />}
							</div>
							<h3 className="line-clamp-1 text-[13px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] md:text-[15px]">{product.name}</h3>
						</div>
					</div>

					{/* Attribute chips sit in their own tinted footer band — keeps
              card heights uniform across the grid even when an individual
              card has no chips to show. */}
					<div className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-2 py-1.5 md:px-2.5 md:py-1.5">
						<div className={CARD_FOOTER_CHIP_SLOT_CLASS}>
							{shouldCycleVariantChips && variantSlides ? (
								<ProductCardTitleChipCycle activeIndex={slideCycle.activeIndex} slides={variantSlides} />
							) : shouldCycleGradeMedia && gradeSlides ? (
								<ProductCardTitleChipCycle activeIndex={slideCycle.activeIndex} slides={gradeSlides} />
							) : (
								<GroupedAttributeChipRow groups={staticTitleChipGroups} maxHeightPx={TITLE_CHIP_ROW_MAX_PX} />
							)}
						</div>
					</div>
				</div>
			</div>
		</Link>
	);
}
