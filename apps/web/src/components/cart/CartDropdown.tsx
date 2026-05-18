"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowUpRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImage } from "@/components/shared/ProductImage";
import { useCart } from "@/lib/cart/useCart";
import type { CartItem } from "@/lib/cart/types";
import { classNames, formatPrice, formatStorage } from "@store/shared";

interface CartDropdownProps {
  open: boolean;
  onClose: () => void;
}

/** Map a stored cart item's category to its URL segment (`phones` etc). */
function categorySegmentFor(category: CartItem["category"]): string {
  switch (category) {
    case "phone":
      return "phones";
    case "accessory":
      return "accessories";
    case "gadget":
      return "gadgets";
    default:
      return "phones";
  }
}

export function CartDropdown({ open, onClose }: CartDropdownProps) {
  const cart = useCart();
  const [isMounted, setIsMounted] = useState(false);

  // Mount-detection flag so we can skip the portal render on the SSR pass
  // and avoid a hydration mismatch. Single setState on mount, never again.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration detection
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !isMounted) {
    return null;
  }
  const totals = { subtotal: cart.subtotalRupees, itemCount: cart.itemCount };
  const lines = cart.items;

  const overlay = (
    <>
      <button
        aria-label="Close cart"
        type="button"
        onClick={onClose}
        className="animate-sheet-fade fixed inset-0 z-[60] cursor-default bg-[var(--color-ink-900)]/15"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 pt-[calc(var(--mobile-header-h)+8px)] md:px-6 md:pt-[calc(var(--desktop-header-h)+8px)] lg:px-8"
      >
        <div className="flex w-full max-w-[1440px] justify-end">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            className="animate-sheet-fade pointer-events-auto flex h-[min(560px,calc(100vh-var(--mobile-header-h)-24px))] w-full max-w-[420px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] md:h-[min(620px,calc(100vh-var(--desktop-header-h)-32px))] md:w-[400px]"
          >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-ink-100)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
              Your cart
            </p>
            <h2 className="text-[16px] font-semibold tracking-tight text-[var(--color-ink-900)]">
              {totals.itemCount} {totals.itemCount === 1 ? "item" : "items"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="tap grid size-9 shrink-0 place-items-center rounded-full text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <X size={16} />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
              <ShoppingBag size={20} />
            </span>
            <p className="text-[14px] font-semibold text-[var(--color-ink-900)]">
              Your cart is empty
            </p>
            <p className="text-[12.5px] text-[var(--color-ink-500)]">
              Add a phone from the shop to get started.
            </p>
            <ButtonLink href="/shop" variant="primary" size="sm" onClick={onClose}>
              Browse phones
            </ButtonLink>
          </div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 divide-y divide-[var(--color-ink-100)] overflow-y-auto px-1">
              {lines.map((line) => (
                <CartDropdownLine
                  key={line.id}
                  line={line}
                  onClose={onClose}
                  onIncrement={() => cart.updateQuantity(line.id, line.quantity + 1)}
                  onDecrement={() => cart.updateQuantity(line.id, line.quantity - 1)}
                  onRemove={() => cart.removeItem(line.id)}
                />
              ))}
            </ul>

            <div className="shrink-0 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-4 py-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
                  Total
                </span>
                <span className="font-headline text-[22px] font-semibold tabular-nums tracking-tight text-[var(--color-ink-900)]">
                  {formatPrice(totals.subtotal)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--color-ink-500)]">
                Delivery &amp; payment chosen at checkout.
              </p>
              <ButtonLink
                href="/checkout"
                variant="primary"
                size="md"
                className="mt-3 w-full"
                onClick={onClose}
                trailingIcon={<ArrowUpRight size={15} strokeWidth={2.4} />}
              >
                Proceed to checkout
              </ButtonLink>
            </div>
          </>
        )}
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(overlay, document.body);
}

interface CartDropdownLineProps {
  line: CartItem;
  onClose: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

function CartDropdownLine({
  line,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
}: CartDropdownLineProps) {
  const { quantity, productName, colorName, storageGb, brandSlug, imageUrl } = line;
  const lineTotal = line.unitPriceRupees * quantity;
  const productHref = `/shop/${categorySegmentFor(line.category)}/${line.productSlug}`;

  return (
    <li className="flex gap-3 px-3 py-3">
      <Link
        href={productHref}
        onClick={onClose}
        className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]"
      >
        <ProductImage
          imageUrl={imageUrl}
          brandName={brandSlug}
          modelName={productName}
          colorName={colorName}
          brandSlug={brandSlug}
          objectFit="cover"
          sizes="64px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
              {brandSlug}
            </p>
            <Link
              href={productHref}
              onClick={onClose}
              className="line-clamp-1 text-[13.5px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] hover:text-[var(--color-accent-800)]"
            >
              {productName}
            </Link>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${productName}`}
            className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--color-ink-400)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-danger-500)]"
          >
            <Trash2 size={13} />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[var(--color-ink-700)]">
          {typeof storageGb === "number" && (
            <span className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px]">
              {formatStorage(storageGb)}
            </span>
          )}
          <span className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px]">
            {colorName}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper
            quantity={quantity}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
          />
          <p className="text-[13.5px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-ink-900)]">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>
    </li>
  );
}

function QuantityStepper({
  quantity,
  onDecrement,
  onIncrement,
}: {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="inline-flex h-7 items-center overflow-hidden rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={onDecrement}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className={classNames(
          "tap grid h-full w-7 place-items-center text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)]",
          "disabled:cursor-not-allowed disabled:text-[var(--color-ink-300)] disabled:hover:bg-transparent",
        )}
      >
        <Minus size={12} />
      </button>
      <span className="grid h-full min-w-[22px] place-items-center text-[12px] font-semibold tabular-nums text-[var(--color-ink-900)]">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={quantity >= 5}
        aria-label="Increase quantity"
        className={classNames(
          "tap grid h-full w-7 place-items-center text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)]",
          "disabled:cursor-not-allowed disabled:text-[var(--color-ink-300)] disabled:hover:bg-transparent",
        )}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
