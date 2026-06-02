"use client";

import Link from "next/link";
import { ArrowUpRight, ShoppingBag, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { ProductImage } from "@/components/shared/ProductImage";
import { GRADE_DIMENSION_KEY } from "@/lib/catalog/pdpSelection";
import { productHref } from "@/lib/catalog/productPaths";
import { useCart } from "@/lib/cart/useCart";
import { useToast } from "@/components/ui/Toast";
import type { CartItem } from "@/lib/cart/types";
import { formatPrice } from "@store/shared";

/**
 * Full-page cart. Mirrors the cart drawer's content but at full width — used
 * when the customer hits `/cart` directly (e.g. from a deep link). Hands off
 * to `/checkout` for the actual purchase flow.
 */
export function Cart() {
  const cart = useCart();

  if (cart.isEmpty) {
    return (
      <div className="storefront-page-center mx-auto max-w-xl text-center">
        <span className="grid mx-auto mb-4 size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
          <ShoppingBag size={20} />
        </span>
        <h1 className="font-headline text-3xl font-semibold tracking-tight text-[var(--color-ink-900)]">
          Your cart is empty
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-[14px] text-[var(--color-ink-600)]">
          Browse the shop, add a product to your cart, then come back to check out.
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
    /* Mobile shell is a fixed-height flex column filling the viewport
       between the mobile header and the floating tab-bar pill, so the
       item list scrolls and the order summary sits anchored at the
       bottom. Desktop reverts to a normal-flow two-column grid. */
    <div className="reveal-stagger mx-auto flex h-[calc(100dvh-var(--mobile-header-h)-var(--mobile-tabbar-h)-env(safe-area-inset-bottom,0px)-32px)] max-w-[1100px] flex-col px-4 pt-4 md:block md:h-auto md:px-6 md:pb-16 md:pt-10 lg:px-8">
      <div className="reveal flex shrink-0 flex-col gap-2 md:gap-3">
        <h1 className="font-headline text-page-title font-semibold text-[var(--color-ink-900)]">
          Your cart
        </h1>
        <p className="text-[13px] text-[var(--color-ink-500)] md:text-sm">
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"} · prices
          re-confirmed at checkout.
        </p>
      </div>

      <div className="reveal mt-4 flex min-h-0 flex-1 flex-col gap-3 md:mt-6 md:grid md:flex-none md:grid-cols-[1fr_320px] md:gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="reveal-stagger min-h-0 flex-1 divide-y divide-[var(--color-ink-100)] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] md:flex-none md:overflow-visible">
          {cart.items.map((line) => (
            <CartLine key={line.id} line={line} />
          ))}
        </ul>

        <aside className="reveal shrink-0 md:space-y-3">
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
            <p className="mt-1 max-w-prose text-[12px] text-[var(--color-ink-500)]">
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
  const { toast } = useToast();
  const lineTotal = line.unitPriceRupees * line.quantity;
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
    <li className="reveal flex items-start gap-4 p-4">
      <Link
        href={lineProductHref}
        className="product-media-well relative size-20 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)]"
      >
        <ProductImage
          image={line.image}
          variant="thumb"
          name={line.productName}
          brandName={line.brandName}
          brandSlug={line.brandSlug}
          sizes="80px"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              {line.brandName}
            </p>
            <Link
              href={lineProductHref}
              className="line-clamp-2 text-[15.5px] font-semibold leading-snug tracking-tight text-[var(--color-ink-900)] hover:text-[var(--color-accent-800)]"
            >
              {line.productName}
            </Link>
          </div>
          <button
            type="button"
            onClick={() => {
              cart.removeItem(line.id);
              toast(`${line.productName} removed`, { tone: "info" });
            }}
            aria-label={`Remove ${line.productName}`}
            className="tap focus-ring grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-ink-400)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-danger-500)]"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--color-ink-700)]">
          {attributeEntries.map(([attrKey, value]) => (
            <Chip key={attrKey}>{value}</Chip>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <QuantityStepper
            quantity={line.quantity}
            max={line.maxQuantity ?? 10}
            onChange={(next) => cart.updateQuantity(line.id, next)}
            size="sm"
          />
          <p className="text-[16px] font-semibold leading-none tracking-tight tabular-nums text-[var(--color-ink-900)]">
            {formatPrice(lineTotal)}
          </p>
        </div>
      </div>
    </li>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium">
      {children}
    </span>
  );
}

