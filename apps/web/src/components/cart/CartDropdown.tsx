"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag, Trash2, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ProductImage } from "@/components/shared/ProductImage";
import { GRADE_DIMENSION_KEY } from "@/lib/catalog/pdpSelection";
import { productHref } from "@/lib/catalog/productPaths";
import { useCart } from "@/lib/cart/useCart";
import type { CartItem } from "@/lib/cart/types";
import { classNames, formatPrice } from "@store/shared";

interface CartDropdownProps {
  open: boolean;
  onClose: () => void;
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
            className={classNames(
              /* Anchored to the header cart trigger — slides down + scales
                 in for a tactile "pulling open" feel rather than a flat
                 fade. */
              "animate-popover-in pointer-events-auto flex h-[min(560px,calc(100dvh-var(--mobile-header-h)-24px))] w-full max-w-[420px] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] md:h-[min(620px,calc(100dvh-var(--desktop-header-h)-32px))] md:w-[400px]",
            )}
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
            <p className="max-w-prose text-[12.5px] text-[var(--color-ink-500)]">
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
                  onRemove={() => cart.removeItem(line.id)}
                  onQuantityChange={(next) => cart.updateQuantity(line.id, next)}
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
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

function CartDropdownLine({
  line,
  onClose,
  onQuantityChange,
  onRemove,
}: CartDropdownLineProps) {
  const { quantity, productName, brandName, brandSlug, image } = line;
  const lineTotal = line.unitPriceRupees * quantity;
  const cartSelection: Record<string, string> = {
    [GRADE_DIMENSION_KEY]: line.gradeSlug,
  };
  for (const [slug, value] of Object.entries(line.attributes ?? {})) {
    const resolved = Array.isArray(value) ? value[0] : value;
    if (resolved) {
      cartSelection[slug] = resolved;
    }
  }
  const lineProductHref =
    line.categorySlug && line.productSlug
      ? productHref(
          { categorySlug: line.categorySlug, slug: line.productSlug },
          { selection: cartSelection },
        )
      : "/shop";
  const attributeEntries = Object.entries(line.attributes ?? {});

  return (
    <li className="flex gap-3 px-3 py-3">
      <Link
        href={lineProductHref}
        onClick={onClose}
        className="product-media-well relative aspect-square w-16 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]"
      >
        <ProductImage
          image={image}
          variant="thumb"
          name={productName}
          brandName={brandName}
          brandSlug={brandSlug}
          sizes="64px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
              {brandName}
            </p>
            <Link
              href={lineProductHref}
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
          {attributeEntries.map(([attrKey, value]) => (
            <span
              key={attrKey}
              className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px]"
            >
              {value}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <QuantityStepper
            quantity={quantity}
            max={line.maxQuantity ?? 10}
            onChange={onQuantityChange}
            size="sm"
          />
          <p className="text-[13.5px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-ink-900)]">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>
    </li>
  );
}

