"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { ProductImage } from "@/components/shared/ProductImage";
import { useCart } from "@/lib/cart/useCart";
import type { CartItem } from "@/lib/cart/types";
import { classNames, formatPrice, formatStorage } from "@store/shared";

/**
 * Full-page cart. Mirrors the cart drawer's content but at full width — used
 * when the customer hits `/cart` directly (e.g. from the wishlist or a deep
 * link). Hands off to `/checkout` for the actual purchase flow.
 */
export function CartView() {
  const cart = useCart();

  if (cart.isEmpty) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <span className="grid mx-auto mb-4 size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
          <ShoppingBag size={20} />
        </span>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-[var(--color-ink-900)]">
          Your cart is empty
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-ink-600)]">
          Browse the shop, pick a phone or accessory, then come back to check out.
        </p>
        <Link
          href="/shop"
          className="cta-arrow mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[var(--color-accent-500)] px-5 text-[14px] font-semibold text-[var(--color-ink-900)]"
        >
          Visit the shop
          <ArrowUpRight size={16} strokeWidth={2.4} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-4 md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/shop"
          className="cta-arrow inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]"
        >
          <ArrowLeft size={13} />
          Back to shop
        </Link>
        <h1 className="font-headline text-[32px] font-semibold leading-[1] tracking-tight text-[var(--color-ink-900)] md:text-[42px]">
          Your cart
        </h1>
        <p className="text-[13px] text-[var(--color-ink-500)] md:text-sm">
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} · prices
          re-confirmed at checkout.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px]">
        <ul className="divide-y divide-[var(--color-ink-100)] rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
          {cart.items.map((line) => (
            <CartLine key={line.id} line={line} />
          ))}
        </ul>

        <aside className="space-y-3">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 md:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Order summary
            </p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-[13px] text-[var(--color-ink-600)]">Subtotal</span>
              <span className="text-[15px] font-semibold tabular-nums tracking-tight text-[var(--color-ink-900)]">
                {formatPrice(cart.subtotalRupees)}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-[var(--color-ink-500)]">
              Delivery, payment discount, and loyalty points are applied at the
              next step.
            </p>
            <Link
              href="/checkout"
              className="cta-arrow mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[14px] font-semibold text-[var(--color-ink-900)] hover:bg-[var(--color-accent-600)]"
            >
              Proceed to checkout
              <ArrowUpRight size={15} strokeWidth={2.4} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CartLine({ line }: { line: CartItem }) {
  const cart = useCart();
  const lineTotal = line.unitPriceRupees * line.quantity;
  const productHref = `/shop/${categorySegmentFor(line.category)}/${line.productSlug}`;
  return (
    <li className="flex gap-4 p-4">
      <Link
        href={productHref}
        className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]"
      >
        <ProductImage
          imageUrl={line.imageUrl}
          brandName={line.brandSlug}
          modelName={line.productName}
          colorName={line.colorName}
          brandSlug={line.brandSlug}
          objectFit="cover"
          sizes="80px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
              {line.brandSlug}
            </p>
            <Link
              href={productHref}
              className="line-clamp-2 text-[14px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] hover:text-[var(--color-accent-800)]"
            >
              {line.productName}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => cart.removeItem(line.id)}
            aria-label={`Remove ${line.productName}`}
            className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-ink-400)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-danger-500)]"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[var(--color-ink-700)]">
          {typeof line.storageGb === "number" && (
            <Chip>{formatStorage(line.storageGb)}</Chip>
          )}
          <Chip>{line.colorName}</Chip>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <QuantityStepper
            quantity={line.quantity}
            onIncrement={() => cart.updateQuantity(line.id, line.quantity + 1)}
            onDecrement={() => cart.updateQuantity(line.id, line.quantity - 1)}
          />
          <p className="text-[14.5px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-ink-900)]">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px]">
      {children}
    </span>
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
    <div className="inline-flex h-8 items-center overflow-hidden rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
      <button
        type="button"
        onClick={onDecrement}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className={classNames(
          "tap grid h-full w-8 place-items-center text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)]",
          "disabled:cursor-not-allowed disabled:text-[var(--color-ink-300)] disabled:hover:bg-transparent",
        )}
      >
        <Minus size={13} />
      </button>
      <span className="grid h-full min-w-[28px] place-items-center text-[12.5px] font-semibold tabular-nums text-[var(--color-ink-900)]">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={quantity >= 10}
        aria-label="Increase quantity"
        className={classNames(
          "tap grid h-full w-8 place-items-center text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)]",
          "disabled:cursor-not-allowed disabled:text-[var(--color-ink-300)] disabled:hover:bg-transparent",
        )}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

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
