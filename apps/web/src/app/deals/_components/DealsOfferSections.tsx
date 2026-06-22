import { ProductCard } from "@/components/shared/ProductCard";
import { OfferCard } from "@/components/shared/OfferCard";
import type { DealsOfferSection } from "@/lib/pricing/dealsPageContent";

interface DealsOfferSectionsProps {
	sections: DealsOfferSection[];
	layout: "mobile" | "desktop";
}

export function DealsOfferSections({ sections, layout }: DealsOfferSectionsProps) {
	if (sections.length === 0) {
		return null;
	}

	const gridClassName = layout === "mobile" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5" : "grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5";

	return (
		<div className={layout === "desktop" ? "mt-16 space-y-16" : "app-section cv-auto-lg space-y-8"}>
			{sections.map((section) => (
				<section key={section.offer.id} id={section.offer.slug} className="scroll-mt-24">
					<div className={layout === "mobile" ? "mb-3" : "mb-5 max-w-xl"}>
						<OfferCard offer={section.offer} size={layout === "mobile" ? "sm" : "lg"} />
					</div>
					{section.products.length > 0 ? (
						<div className={`reveal-scroll-list ${gridClassName}`}>
							{section.products.map((product) => (
								<div key={product.id} className="reveal reveal-scroll reveal-rise">
									<ProductCard product={product} catalogProduct={product} />
								</div>
							))}
						</div>
					) : (
						<p className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-4 py-6 text-center text-[13px] text-[var(--color-ink-500)]">
							Matching products will appear here when in stock.
						</p>
					)}
				</section>
			))}
		</div>
	);
}
