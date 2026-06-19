import { ProductGridSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";
import {
	SHOP_CATEGORY_GRID_CLASS,
	SHOP_CATEGORY_PAGE_CLASS,
	SHOP_CATEGORY_SKELETON_CARDS,
} from "@/lib/catalog/shopListingGrid";

const SHOP_INTRO_DESKTOP_GRADIENT =
	"linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 60%, var(--color-canvas)) 0%, var(--color-canvas) 60%, var(--color-canvas) 100%)";

const SHOP_INTRO_MOBILE_GRADIENT =
	"linear-gradient(180deg, color-mix(in srgb, var(--color-accent-50) 55%, var(--color-canvas)) 0%, var(--color-canvas) 55%, var(--color-canvas) 100%)";

const SHOP_FLANK_LABEL_COUNT = 3;

function ShopIntroHeroFlankFallback({ side }: { side: "left" | "right" }) {
	const alignClass = side === "left" ? "items-end pr-2 sm:pr-3 md:pr-4" : "items-start pl-2 sm:pl-3 md:pl-4";

	return (
		<div className={`flex min-w-0 flex-col justify-center gap-5 py-1 ${alignClass}`}>
			{Array.from({ length: SHOP_FLANK_LABEL_COUNT }).map((_, index) => (
				<Skeleton
					key={index}
					shape="text"
					className={
						index === 1
							? "h-4 w-[5.5rem] sm:w-24"
							: index === 0
								? "h-3 w-16 sm:w-20"
								: "h-3.5 w-20 sm:w-[5.5rem]"
					}
				/>
			))}
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
			<div
				className={`relative z-10 flex w-full flex-col items-center text-center ${SHOP_CATEGORY_PAGE_CLASS}`}
			>
				<div className="w-full min-w-0 overflow-hidden px-0.5 py-1.5">
					<div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-x-3 sm:gap-x-5 md:gap-x-8 lg:gap-x-10">
						<ShopIntroHeroFlankFallback side="left" />
						<div className="flex shrink-0 flex-col items-center gap-2 px-0.5 py-1">
							<Skeleton shape="text" className="h-[2.4rem] w-[8.5rem] md:h-[3rem] md:w-[10.5rem]" />
							<Skeleton shape="text" className="h-[3.8rem] w-[10rem] md:h-[4.6rem] md:w-[12.5rem]" />
						</div>
						<ShopIntroHeroFlankFallback side="right" />
					</div>
				</div>
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
				<div className="w-full min-w-0 overflow-hidden px-0.5 py-1.5">
					<div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-x-3 sm:gap-x-5">
						<ShopIntroHeroFlankFallback side="left" />
						<div className="flex shrink-0 flex-col items-center gap-1.5 px-0.5 py-1">
							<Skeleton shape="text" className="h-8 w-[6.5rem]" />
							<Skeleton shape="text" className="h-12 w-[8rem]" />
						</div>
						<ShopIntroHeroFlankFallback side="right" />
					</div>
				</div>
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
    <nav
      aria-hidden
      className="flex min-w-0 flex-1 flex-wrap justify-start gap-2 md:gap-2.5"
    >
      {Array.from({ length: pillCount }).map((_, index) => (
        <Skeleton key={index} shape="pill" className="h-8 w-[4.5rem] shrink-0 md:w-20" />
      ))}
    </nav>
  );
}

export function ShopMobileToolbarFilterFallback() {
  return <Skeleton shape="pill" className="h-9 w-20" />;
}

export function ShopMobileProductsAreaFallback() {
	return <ShopProductsAreaFallback />;
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

/**
 * Desktop filter sidebar fallback for the category-segment loader.
 *
 * Mirrors the live `FilterSidebar` chrome (outer rounded border, inner
 * `p-2.5` padding, dividers, price footer) so the transition into the
 * rendered sidebar is pixel-stable. All groups are skeletoned — the
 * sidebar has no controls that can act independently of the category
 * data we're waiting on.
 */
export function ShopDesktopFilterSidebarFallback() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-accent-200)]/45 bg-[var(--color-surface)]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-3 p-2.5 pb-3">
          <FilterSidebarFallbackGroup title="Grade">
            <FilterCheckRowSkeletonList rows={4} />
          </FilterSidebarFallbackGroup>
          <FilterSidebarFallbackDivider />

          <FilterSidebarFallbackGroup title="Brand">
            <FilterCheckRowSkeletonList rows={6} />
          </FilterSidebarFallbackGroup>
          <FilterSidebarFallbackDivider />

          {Array.from({ length: 2 }).map((_, groupIndex) => (
            <FilterSidebarFallbackGroup
              key={groupIndex}
              title={<Skeleton shape="text" className="h-3 w-20" />}
            >
              <FilterCheckRowSkeletonList rows={4} />
            </FilterSidebarFallbackGroup>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5">
        <div className="space-y-2">
          <Skeleton shape="text" className="h-3 w-12" />
          <div className="flex items-center gap-2">
            <Skeleton shape="pill" className="h-9 flex-1" />
            <span aria-hidden className="text-[var(--color-ink-300)]">–</span>
            <Skeleton shape="pill" className="h-9 flex-1" />
          </div>
          <Skeleton shape="pill" className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

interface FilterSidebarFallbackGroupProps {
  title: React.ReactNode;
  children: React.ReactNode;
}

function FilterSidebarFallbackGroup({
  title,
  children,
}: FilterSidebarFallbackGroupProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterSidebarFallbackDivider() {
  return <div className="h-px bg-[var(--color-ink-100)]" />;
}

function FilterCheckRowSkeletonList({ rows }: { rows: number }) {
  return (
    <div className="space-y-0.5">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1"
        >
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-[18px]" />
            <Skeleton shape="text" className="h-3 w-24" />
          </div>
          <Skeleton shape="text" className="h-3 w-6" />
        </div>
      ))}
    </div>
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
			<ProductGridSkeleton
				count={SHOP_CATEGORY_SKELETON_CARDS}
				className={SHOP_CATEGORY_GRID_CLASS}
			/>
			<div className="flex justify-center pt-2">
				<Skeleton shape="pill" className="h-10 w-32" />
			</div>
		</div>
	);
}

export function ShopDesktopProductsAreaFallback() {
  return <ShopProductsAreaFallback />;
}
