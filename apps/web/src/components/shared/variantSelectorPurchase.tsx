"use client";

import { Check, ShoppingBag } from "lucide-react";

import { formatPrice } from "@store/shared";

import { Button } from "@store/ui";
import { QuantityStepper } from "@store/ui";

import { formatMissingPrompt } from "./variantSelectorDimensions";

const BUY_ALL_BUTTON_CLASS =
	"tap shrink-0 rounded-[var(--radius-full)] border border-[var(--color-accent-400)] bg-[var(--color-accent-100)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-accent-800)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-accent-200)] active:bg-[var(--color-accent-300)] md:px-3 md:py-1 md:text-[13px]";

interface PurchaseSummaryProps {
  isInStock: boolean;
  stockQuantity: number;
  remainingStock: number;
  priceRupees: number;
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
  discountAmount?: number;
}

export function PurchaseSummary({
  isInStock,
  stockQuantity,
  remainingStock,
  priceRupees,
  quantity,
  maxQuantity,
  onQuantityChange,
  onAddToCart,
  hasJustBeenAdded,
  discountAmount,
}: PurchaseSummaryProps) {
  const stockLabel = isInStock
    ? `${stockQuantity} in stock${
        remainingStock < stockQuantity
          ? ` · ${remainingStock} available to add`
          : ""
      }`
    : "Sold out";
  const showBuyAll = isInStock && maxQuantity > 1 && quantity < maxQuantity;

  function getButtonLabel() {
    if (!isInStock) return "Sold out";
    if (maxQuantity <= 0) return "Max in cart";
    if (hasJustBeenAdded) return "Added to cart";
    return "Add to cart";
  }

  return (
    <div className="hidden md:block">
      {/* Concentric: inner Button --radius-md (8) + p-2.5 (10) →
          outer 18 ≈ --radius-xl (20, within 2px). */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-sm)]">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)] md:text-[13px]">
              {stockLabel}
            </p>
            {showBuyAll ? (
              <button
                type="button"
                onClick={() => onQuantityChange(maxQuantity)}
                className={BUY_ALL_BUTTON_CLASS}
              >
                Buy all
              </button>
            ) : null}
          </div>
          <div className="flex flex-col items-end">
            {discountAmount && discountAmount > 0 ? (
              <>
                <p className="text-[12px] font-medium text-[var(--color-ink-500)] line-through">
                  {formatPrice(priceRupees)}
                </p>
                <p className="text-xl font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
                  {formatPrice(priceRupees - discountAmount)}
                </p>
              </>
            ) : (
              <p className="text-xl font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
                {formatPrice(priceRupees)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {isInStock ? (
            <QuantityStepper
              quantity={quantity}
              max={maxQuantity}
              onChange={onQuantityChange}
              size="sm"
            />
          ) : null}
          <Button
            variant="primary"
            size="sm"
            leadingIcon={
              hasJustBeenAdded ? <Check size={14} className="animate-badge-pop" /> : <ShoppingBag size={14} />
            }
            className="min-w-0 flex-1 transition-all duration-300 ease-out-quart"
            disabled={!isInStock || maxQuantity <= 0}
            onClick={onAddToCart}
          >
            {getButtonLabel()}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Mobile sticky CTA ─────────────────────── */

interface MobileStickyCtaProps {
  priceRupees: number;
  isInStock: boolean;
  stockQuantity: number;
  remainingStock: number;
  quantity: number;
  maxQuantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
  discountAmount?: number;
}

export function MobileStickyCta({
  priceRupees,
  isInStock,
  stockQuantity,
  remainingStock,
  quantity,
  maxQuantity,
  onQuantityChange,
  onAddToCart,
  hasJustBeenAdded,
  discountAmount,
}: MobileStickyCtaProps) {
  const showBuyAll = isInStock && maxQuantity > 1 && quantity < maxQuantity;

  return (
    <div
      className="fixed inset-x-3 z-30 rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 pt-2 shadow-[var(--shadow-lg)] md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        paddingBottom: "10px",
      }}
    >
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-[12px] font-medium text-[var(--color-ink-500)]">
            {isInStock ? (
              <>
                {stockQuantity} in stock
                {remainingStock < stockQuantity
                  ? ` · ${remainingStock} available`
                  : null}
              </>
            ) : (
              "Sold out"
            )}
          </p>
          {showBuyAll ? (
            <button
              type="button"
              onClick={() => onQuantityChange(maxQuantity)}
              className={BUY_ALL_BUTTON_CLASS}
            >
              Buy all
            </button>
          ) : null}
        </div>
        <div className="flex flex-col items-end">
          {discountAmount && discountAmount > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[var(--color-ink-500)] line-through">
                {formatPrice(priceRupees)}
              </span>
              <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
                {formatPrice(priceRupees - discountAmount)}
              </p>
            </div>
          ) : (
            <p className="text-[15px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
              {formatPrice(priceRupees)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {isInStock ? (
          <>
            <QuantityStepper
              quantity={quantity}
              max={maxQuantity}
              onChange={onQuantityChange}
              size="sm"
            />
            <button
              type="button"
              onClick={onAddToCart}
              disabled={maxQuantity <= 0}
              aria-live="polite"
              className="tap inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-accent-500)] px-3 text-[12px] font-semibold text-[var(--color-ink-900)] transition-all duration-300 ease-out-quart active:bg-[var(--color-accent-600)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {hasJustBeenAdded ? <Check size={13} className="animate-badge-pop" /> : <ShoppingBag size={13} />}
              {hasJustBeenAdded ? "Added" : "Add to cart"}
            </button>
          </>
        ) : (
          <span className="inline-flex h-8 flex-1 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-ink-100)] px-3 text-[12px] font-semibold text-[var(--color-ink-500)]">
            Sold out
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────── Incomplete-selection placeholders ─────────────────────── */

export function SelectToSeePrice({
  attributeLabels,
}: {
  attributeLabels: string[];
}) {
  return (
    <div className="hidden md:block">
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 p-3 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          {formatMissingPrompt(attributeLabels)}
        </p>
      </div>
    </div>
  );
}

export function MobileStickyPlaceholder({
  attributeLabels,
}: {
  attributeLabels: string[];
}) {
  return (
    <div
      className="fixed inset-x-3 z-30 rounded-[var(--radius-2xl)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 pt-2 shadow-[var(--shadow-lg)] md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        paddingBottom: "10px",
      }}
    >
      <div className="flex h-8 items-center justify-center rounded-[var(--radius-full)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {formatMissingPrompt(attributeLabels)}
      </div>
    </div>
  );
}
