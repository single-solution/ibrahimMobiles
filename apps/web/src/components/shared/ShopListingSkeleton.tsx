import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import { DEAL_BUTTONS_LAYOUT_CLASS } from "@/app/_components/shop/dealOfferButtonStyles";
import { SHOP_CATEGORY_GRID_CLASS, SHOP_CATEGORY_PAGE_CLASS, SHOP_CATEGORY_SKELETON_CARDS } from "@/lib/catalog/shopListingGrid";

const SHOP_INTRO_DESKTOP_GRADIENT =
	"linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 60%, var(--color-canvas)) 0%, var(--color-canvas) 60%, var(--color-canvas) 100%)";

const SHOP_INTRO_MOBILE_GRADIENT =
	"linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 55%, var(--color-canvas)) 0%, var(--color-canvas) 55%, var(--color-canvas) 100%)";

const DESKTOP_FLANK_SLOTS = {
	left: [
		{ top: "28%", className: "right-[38%] h-3 w-[4.5rem] sm:w-20" },
		{ top: "52%", className: "right-[34%] h-3.5 w-24 sm:w-28" },
		{ top: "72%", className: "right-[42%] h-3 w-16 sm:w-[4.5rem]" },
	],
	right: [
		{ top: "28%", className: "left-[38%] h-3 w-[4.5rem] sm:w-20" },
		{ top: "52%", className: "left-[34%] h-3.5 w-24 sm:w-28" },
		{ top: "72%", className: "left-[42%] h-3 w-16 sm:w-[4.5rem]" },
	],
} as const;

const MOBILE_FLANK_SLOTS = {
	left: [
		{ top: "34%", className: "right-[36%] h-2.5 w-[4.25rem]" },
		{ top: "66%", className: "right-[40%] h-3 w-20" },
	],
	right: [
		{ top: "34%", className: "left-[36%] h-2.5 w-[4.25rem]" },
		{ top: "66%", className: "left-[40%] h-3 w-20" },
	],
} as const;

function ShopIntroHeroFlankFallback({ side, variant }: { side: "left" | "right"; variant: "mobile" | "desktop" }) {
	const slots = variant === "desktop" ? DESKTOP_FLANK_SLOTS[side] : MOBILE_FLANK_SLOTS[side];
	const columnClass =
		variant === "desktop"
			? side === "left"
				? "min-w-0 w-full py-1 pl-2.5 sm:pl-3 md:pl-4"
				: "min-w-0 w-full py-1 pr-2.5 sm:pr-3 md:pr-4"
			: side === "left"
				? "min-w-0 w-full py-1 pl-2.5 sm:pl-3"
				: "min-w-0 w-full py-1 pr-2.5 sm:pr-3";

	return (
		<div className={`relative min-h-[11rem] self-stretch md:min-h-[21rem] ${columnClass}`} aria-hidden>
			{slots.map((slot, index) => (
				<Skeleton key={index} shape="text" className={`absolute ${slot.className}`} style={{ top: slot.top }} />
			))}
		</div>
	);
}

function ShopIntroHeroHeadlineFallback({ variant }: { variant: "mobile" | "desktop" }) {
	if (variant === "desktop") {
		return (
			<div className="flex shrink-0 flex-col items-center gap-1 px-0.5 py-1.5 md:py-2" aria-hidden>
				<Skeleton shape="text" className="h-[4.5rem] w-[8.75rem] md:h-[5.25rem] md:w-[10.5rem]" />
				<Skeleton shape="text" className="h-[7rem] w-[11rem] bg-[var(--color-accent-200)] md:h-[8.5rem] md:w-[13rem]" />
			</div>
		);
	}

	return (
		<div className="flex shrink-0 flex-col items-center gap-1 px-0.5 py-1.5" aria-hidden>
			<Skeleton shape="text" className="h-[3.75rem] w-[7rem]" />
			<Skeleton shape="text" className="h-[5.25rem] w-[8.5rem] bg-[var(--color-accent-200)]" />
		</div>
	);
}

function ShopIntroHeroDealsFallback() {
	return (
		<div className="mt-[18px] w-full px-0.5" aria-hidden>
			<div className={DEAL_BUTTONS_LAYOUT_CLASS}>
				<Skeleton className="min-h-[5.25rem] w-full rounded-[var(--radius-md)] md:min-h-0 md:h-10 md:w-44 md:rounded-full" />
				<Skeleton shape="pill" className="min-h-[5.25rem] w-full md:min-h-0 md:h-10 md:w-28" />
			</div>
		</div>
	);
}

function ShopIntroHeroHeadlineGrid({ variant }: { variant: "mobile" | "desktop" }) {
	const gapClass = variant === "desktop" ? "gap-x-3 sm:gap-x-5 md:gap-x-8 lg:gap-x-10" : "gap-x-3 sm:gap-x-5";

	return (
		<div className="w-full min-w-0 overflow-hidden px-0.5 py-1.5">
			<div className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch ${gapClass}`}>
				<ShopIntroHeroFlankFallback side="left" variant={variant} />
				<ShopIntroHeroHeadlineFallback variant={variant} />
				<ShopIntroHeroFlankFallback side="right" variant={variant} />
			</div>
		</div>
	);
}

function ShopIntroHeroDesktopFallback() {
	return (
		<section
			aria-hidden
			className="relative -mt-[var(--desktop-header-h)] flex flex-col overflow-hidden pb-8 pt-[calc(var(--desktop-header-h)+2rem)] md:pb-10 md:pt-[calc(var(--desktop-header-h)+2.5rem)]"
			style={{ background: SHOP_INTRO_DESKTOP_GRADIENT }}
		>
			<div className={`relative z-10 flex w-full flex-col items-center text-center ${SHOP_CATEGORY_PAGE_CLASS}`}>
				<ShopIntroHeroHeadlineGrid variant="desktop" />
				<ShopIntroHeroDealsFallback />
			</div>
		</section>
	);
}

function ShopIntroHeroMobileFallback() {
	return (
		<section
			aria-hidden
			className="relative -mt-[var(--mobile-header-h)] flex flex-col items-center overflow-hidden pb-8 pt-[calc(var(--mobile-header-h)+1.75rem)] text-center md:pb-10 md:pt-[calc(var(--mobile-header-h)+2.25rem)]"
			style={{ background: SHOP_INTRO_MOBILE_GRADIENT }}
		>
			<div className={`relative z-10 flex w-full flex-col items-center text-center ${SHOP_CATEGORY_PAGE_CLASS}`}>
				<ShopIntroHeroHeadlineGrid variant="mobile" />
				<ShopIntroHeroDealsFallback />
			</div>
		</section>
	);
}

/** Shape-matched fallback for `ShopIntroHero` (compact content layout). */
export function ShopIntroHeroFallback() {
	return (
		<>
			<div className="md:hidden">
				<ShopIntroHeroMobileFallback />
			</div>
			<div className="hidden md:block">
				<ShopIntroHeroDesktopFallback />
			</div>
		</>
	);
}

/**
 * Home catalog listing skeletons — used by category loading and Suspense fallbacks.
 */

export function ShopCategoryRailFallback({ pillCount = 6 }: { pillCount?: number }) {
	return (
		<nav aria-hidden className="flex min-w-0 flex-1 flex-wrap justify-start gap-2 md:gap-2.5">
			{Array.from({ length: pillCount }).map((_, index) => (
				<Skeleton key={index} shape="pill" className="h-8 w-[4.5rem] shrink-0 md:w-20" />
			))}
		</nav>
	);
}

export function ShopCategoryPageLoading({ includeHero = false }: { includeHero?: boolean }) {
	return (
		<SkeletonScreen label="Loading shop">
			{includeHero ? <ShopIntroHeroFallback /> : null}
			<div className={`${SHOP_CATEGORY_PAGE_CLASS} pb-10 md:pb-20`}>
				<ShopCatalogToolbarFallback />
				<div className="shop-listing-mobile-scroll-pad pt-1">
					<ShopProductsAreaFallback />
				</div>
			</div>
		</SkeletonScreen>
	);
}

export function ShopFilterRowFallback() {
	return (
		<div className="flex shrink-0 flex-wrap items-center justify-end gap-2 md:gap-2.5" aria-hidden>
			{Array.from({ length: 4 }).map((_, pillIndex) => (
				<Skeleton key={pillIndex} shape="pill" className="h-8 w-[4.5rem] md:w-20" />
			))}
		</div>
	);
}

export function ShopCatalogToolbarFallback() {
	return (
		<>
			<div className="shop-listing-toolbar-sticky md:hidden">
				<div className="shop-listing-toolbar flex items-center gap-2 p-2" aria-hidden>
					<Skeleton shape="pill" className="h-9 flex-1" />
					<Skeleton shape="pill" className="h-9 flex-1" />
				</div>
			</div>

			<div className="hidden flex-col gap-3 pb-4 md:flex md:pb-5">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<ShopCategoryRailFallback />
					<ShopFilterRowFallback />
				</div>
			</div>
		</>
	);
}

export function ShopProductsAreaFallback() {
	return (
		<div className="min-h-[60vh] space-y-6 md:min-h-[70vh]">
			<ProductGridSkeleton count={SHOP_CATEGORY_SKELETON_CARDS} className={SHOP_CATEGORY_GRID_CLASS} />
			<div className="flex justify-center pt-2">
				<Skeleton shape="pill" className="h-10 w-32" />
			</div>
		</div>
	);
}
