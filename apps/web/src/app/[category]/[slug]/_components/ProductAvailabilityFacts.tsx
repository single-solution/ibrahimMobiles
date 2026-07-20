import type { ProductSeoFacts } from "@store/shared";

interface ProductAvailabilityFactsProps {
	facts: ProductSeoFacts;
}

/**
 * Server-rendered availability summary for PDP — mirrors ProductGroup JSON-LD facts
 * for crawlers and GEO citation (visible, not hidden).
 */
export function ProductAvailabilityFacts({ facts }: ProductAvailabilityFactsProps) {
	if (facts.inStockVariantCount === 0 && !facts.priceLead && !facts.gradeList && !facts.topAttributesSummary) {
		return null;
	}

	return (
		<section className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] px-4 py-3" aria-label="Availability and pricing summary">
			<h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">At a glance</h2>
			<dl className="mt-2 grid gap-2 text-sm text-[var(--color-ink-800)] sm:grid-cols-2">
				{facts.priceLead ? (
					<div>
						<dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Price</dt>
						<dd className="font-semibold text-[var(--color-ink-900)]">{facts.priceLead}</dd>
					</div>
				) : null}
				{facts.gradeList ? (
					<div>
						<dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Grades in stock</dt>
						<dd>{facts.gradeList}</dd>
					</div>
				) : null}
				{facts.topAttributesSummary ? (
					<div>
						<dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Configurations</dt>
						<dd>{facts.topAttributesSummary}</dd>
					</div>
				) : null}
				{facts.inStockVariantCount > 0 ? (
					<div>
						<dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-500)]">Availability</dt>
						<dd>
							{facts.inStockVariantCount} configuration{facts.inStockVariantCount === 1 ? "" : "s"} in stock
						</dd>
					</div>
				) : null}
			</dl>
		</section>
	);
}
