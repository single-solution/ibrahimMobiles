"use client";

import { classNames, formatPrice, formatWarrantyPeriod, isVariantInStock, type ProductAttributeConfig } from "@store/shared";

import type { AdminAttribute } from "@/types/models";

import { VariantInStockToggle } from "./VariantCard";
import { describeVariantDraftLabel, type VariantDraft } from "./productFormState";

function formatVariantQuantityLabel(quantity: number): string {
	const count = Math.max(0, Math.floor(quantity));
	return count === 1 ? "1 piece" : `${count} pieces`;
}

/** Compact variant row for the manage-variations sidebar (label + price/stock). */
export function VariantSidebarTile({
	variant,
	attributes,
	productConfig,
	isSelected,
	onSelect,
	onChange,
	hasErrors = false,
	errorCount = 0,
}: {
	variant: VariantDraft;
	attributes: AdminAttribute[];
	productConfig: ProductAttributeConfig;
	isSelected: boolean;
	onSelect: () => void;
	onChange: (next: VariantDraft) => void;
	hasErrors?: boolean;
	errorCount?: number;
}) {
	const label =
		describeVariantDraftLabel(variant, attributes, {
			productConfig,
			hideSingularPoolAttributes: true,
		}) || "New variant";
	const shoppable = isVariantInStock(variant);
	const priceLabel = variant.priceRupees > 0 ? formatPrice(variant.priceRupees) : "No price";
	const quantityLabel = formatVariantQuantityLabel(variant.quantity);
	const warrantyLabel =
		variant.warrantyDays !== null && variant.warrantyDays > 0 ? formatWarrantyPeriod(variant.warrantyDays) : "No warranty";
	const subtitle = [priceLabel, quantityLabel, warrantyLabel].join(" · ");

	return (
		<li
			className={classNames(
				"rounded-[var(--radius-md)] border bg-[var(--color-surface)] transition-colors",
				hasErrors
					? "border-[var(--color-rose-400)] bg-[var(--color-rose-50)]"
					: isSelected
						? "border-[var(--color-ink-900)] shadow-[var(--shadow-sm)]"
						: "border-[var(--color-ink-100)]",
				!shoppable && !hasErrors && "opacity-75",
			)}
		>
			<div className="flex items-start gap-2 px-2 py-2">
				<button
					type="button"
					onClick={onSelect}
					aria-pressed={isSelected}
					className="min-w-0 flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)] focus-visible:ring-offset-2"
				>
					<p className="truncate text-[11px] font-semibold text-[var(--color-ink-900)]">{label}</p>
					<p className="mt-0.5 truncate text-[10px] text-[var(--color-ink-500)]">{subtitle}</p>
					{hasErrors ? (
						<p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--color-rose-700)]">{errorCount === 1 ? "Needs attention" : `${errorCount} fields need attention`}</p>
					) : null}
				</button>
				<div className="flex shrink-0 flex-col items-end gap-1">
					<VariantInStockToggle variant={variant} onChange={onChange} />
					{hasErrors ? (
						<span aria-hidden className="grid size-5 place-items-center rounded-full bg-[var(--color-rose-600)] text-[10px] font-bold text-white">
							{errorCount > 9 ? "9+" : errorCount}
						</span>
					) : null}
				</div>
			</div>
		</li>
	);
}
