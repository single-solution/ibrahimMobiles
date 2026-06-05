"use client";

import { Check, MessageCircle, ShoppingBag } from "lucide-react";

import { buildWhatsAppLink, formatPrice } from "@store/shared";

import { Button } from "@store/ui";
import { QuantityStepper } from "@store/ui";
import { useStoreSettings } from "@/lib/core/storeSettingsContext";

import { formatMissingPrompt } from "./variantSelectorDimensions";

import type { DiscountApplication } from "@store/shared";

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
  activeOffer?: DiscountApplication;
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
  activeOffer,
  discountAmount,
}: PurchaseSummaryProps) {
  const { globalDeliveryNote } = useStoreSettings();
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
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              {stockLabel}
            </p>
            {showBuyAll ? (
              <button
                type="button"
                onClick={() => onQuantityChange(maxQuantity)}
                className="text-[10px] font-semibold text-[var(--color-accent-700)] underline-offset-2 hover:text-[var(--color-accent-800)] hover:underline"
              >
                Buy all ({maxQuantity})
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
                {activeOffer && (
                  <span className="mt-1 rounded-sm bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-accent-800)]">
                    {activeOffer.offerTitle}
                  </span>
                )}
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
        {globalDeliveryNote && (
          <p className="mt-2 text-center text-[11px] font-medium text-[var(--color-ink-500)]">
            🚚 Delivery: {globalDeliveryNote}
          </p>
        )}
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
  whatsappMessage: string;
  onAddToCart: () => void;
  hasJustBeenAdded: boolean;
  activeOffer?: DiscountApplication;
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
  whatsappMessage,
  onAddToCart,
  hasJustBeenAdded,
  activeOffer,
  discountAmount,
}: MobileStickyCtaProps) {
  const { whatsappNumber, globalDeliveryNote } = useStoreSettings();
  const showBuyAll = isInStock && maxQuantity > 1 && quantity < maxQuantity;

  return (
    <div
      className="fixed inset-x-0 z-30 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 px-2.5 pt-2 backdrop-blur md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "10px",
      }}
    >
      <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-[10px] font-medium text-[var(--color-ink-500)]">
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
              className="shrink-0 text-[10px] font-semibold text-[var(--color-accent-700)] underline-offset-2 hover:text-[var(--color-accent-800)] hover:underline"
            >
              Buy all ({maxQuantity})
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
            <a
              href={buildWhatsAppLink(whatsappMessage, whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inquire on WhatsApp"
              className="tap grid size-8 shrink-0 place-items-center rounded-[var(--radius-full)] bg-[var(--color-whatsapp)] text-[var(--color-on-dark)] shadow-[var(--shadow-sm)] active:bg-[var(--color-whatsapp-dark)]"
            >
              <MessageCircle size={14} className="fill-[var(--color-on-dark)]" />
            </a>
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
      {globalDeliveryNote && (
        <p className="mt-1 w-full text-center text-[9px] font-medium text-[var(--color-ink-500)]">
          🚚 Delivery: {globalDeliveryNote}
        </p>
      )}
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
      className="fixed inset-x-0 z-30 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 px-2.5 pt-2 backdrop-blur md:hidden"
      style={{
        bottom: "calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "10px",
      }}
    >
      <div className="flex h-8 items-center justify-center rounded-[var(--radius-full)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/40 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        {formatMissingPrompt(attributeLabels)}
      </div>
    </div>
  );
}
