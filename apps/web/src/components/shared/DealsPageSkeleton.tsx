import { ProductCardSkeleton } from "@/components/shared/ProductCardSkeleton";
import { Skeleton, SkeletonScreen } from "@/components/ui/Skeleton";

const MOBILE_PRODUCT_COUNT = 4;
const DESKTOP_PRODUCT_COUNT = 4;
const SECTION_COUNT = 2;

function DealsHeroSkeleton({ layout }: { layout: "mobile" | "desktop" }) {
	if (layout === "mobile") {
		return (
			<section className="reveal app-section flex flex-col items-center text-center">
				<Skeleton shape="pill" className="h-6 w-28" />
				<Skeleton shape="text" className="mt-3 h-8 w-48" />
				<Skeleton shape="text" className="mt-2.5 h-4 w-64 max-w-full" />
			</section>
		);
	}

	return (
		<header className="reveal space-y-3">
			<Skeleton shape="text" className="h-3 w-28" />
			<Skeleton shape="text" className="h-12 w-80 max-w-full" />
			<Skeleton shape="text" className="h-4 w-96 max-w-full" />
		</header>
	);
}

/** Deals route placeholder — hero + spotlight + offer sections. */
export function DealsPageSkeleton() {
	return (
		<SkeletonScreen label="Loading deals">
			<div className="app-page pb-6 pt-3 md:hidden">
				<DealsHeroSkeleton layout="mobile" />
				<section className="app-section">
					<Skeleton shape="text" className="mb-3 h-3 w-32" />
					<Skeleton shape="block" className="h-[120px] w-full rounded-[var(--radius-lg)]" />
				</section>
				{Array.from({ length: SECTION_COUNT }).map((_, index) => (
					<section key={index} className="app-section space-y-3">
						<Skeleton shape="block" className="h-28 w-full rounded-[var(--radius-lg)]" />
						<div className="grid grid-cols-2 gap-2.5 sm:gap-3">
							{Array.from({ length: MOBILE_PRODUCT_COUNT }).map((__, productIndex) => (
								<ProductCardSkeleton key={productIndex} />
							))}
						</div>
					</section>
				))}
			</div>

			<div className="mx-auto hidden w-full max-w-[1440px] px-4 pb-24 pt-6 sm:px-6 md:block md:pb-16 md:pt-10 lg:px-8">
				<DealsHeroSkeleton layout="desktop" />
				<Skeleton shape="block" className="mt-10 h-[220px] w-full max-w-3xl rounded-[var(--radius-xl)]" />
				<div className="mt-16 space-y-16">
					{Array.from({ length: SECTION_COUNT }).map((_, index) => (
						<section key={index} className="space-y-5">
							<Skeleton shape="block" className="h-72 max-w-xl rounded-[var(--radius-xl)]" />
							<div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
								{Array.from({ length: DESKTOP_PRODUCT_COUNT }).map((__, productIndex) => (
									<ProductCardSkeleton key={productIndex} />
								))}
							</div>
						</section>
					))}
				</div>
			</div>
		</SkeletonScreen>
	);
}
