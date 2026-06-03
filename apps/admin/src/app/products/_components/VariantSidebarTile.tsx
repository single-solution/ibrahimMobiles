"use client";

import { classNames, formatPrice } from "@store/shared";

import type { AdminAttribute } from "@/types/models";

import {
  describeVariantDraftLabel,
  type VariantDraft,
} from "./productFormState";

/** Compact variant row for the manage-variations sidebar (label + price/stock). */
export function VariantSidebarTile({
  variant,
  attributes,
  isSelected,
  onSelect,
}: {
  variant: VariantDraft;
  attributes: AdminAttribute[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const label = describeVariantDraftLabel(variant, attributes) || "New variant";
  const inStock = variant.quantity > 0;
  const priceLabel =
    variant.priceRupees > 0 ? formatPrice(variant.priceRupees) : "No price";

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        className={classNames(
          "flex w-full items-center rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-500)] focus-visible:ring-offset-2",
          isSelected
            ? "border-[var(--color-ink-900)] shadow-[var(--shadow-sm)]"
            : "border-[var(--color-ink-100)] hover:border-[var(--color-ink-200)]",
          !inStock && "opacity-75",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold text-[var(--color-ink-900)]">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--color-ink-500)]">
            {priceLabel}
            {inStock ? ` · ${variant.quantity} in stock` : " · Sold out"}
          </p>
        </div>
      </button>
    </li>
  );
}
