"use client";

import Link from "next/link";
import { Heart, Search, ShoppingBag, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ProductImage } from "@/components/shared/ProductImage";
import { useWishlist } from "@/lib/wishlist/useWishlist";
import { classNames, formatPrice, type ProductCategory } from "@store/shared";

const CATEGORY_PATH: Record<ProductCategory, string> = {
  phone: "phones",
  accessory: "accessories",
  gadget: "gadgets",
};

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  phone: "Phone",
  accessory: "Accessory",
  gadget: "Gadget",
};

export function WishlistView() {
  const wishlist = useWishlist();

  if (wishlist.itemCount === 0) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 md:px-6 md:pt-10 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-ink-100)] pb-5 md:pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Saved for later
          </p>
          <h1 className="mt-1 font-headline text-[28px] font-semibold leading-[0.95] tracking-tight text-[var(--color-ink-900)] md:text-[40px]">
            Your wishlist
            <span className="ml-2 align-middle text-[var(--color-ink-400)]">
              · {wishlist.itemCount}
            </span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => wishlist.clear()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]"
        >
          <Trash2 size={13} />
          Clear all
        </button>
      </header>

      <ul className="mt-5 grid gap-3 md:mt-6 md:grid-cols-2 md:gap-4">
        {wishlist.items.map((saved) => {
          const href = `/shop/${CATEGORY_PATH[saved.category]}/${saved.productSlug}`;
          return (
            <li key={saved.productId}>
              <Card className="flex h-full flex-col overflow-hidden">
                <div className="flex flex-1 gap-3 p-3 md:gap-4 md:p-4">
                  <Link
                    href={href}
                    className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-canvas-deep)] md:w-28"
                  >
                    <ProductImage
                      imageUrl={saved.imageUrl}
                      brandName={saved.brandName}
                      modelName={saved.modelName}
                      colorName=""
                      brandSlug={saved.brandSlug}
                      objectFit="cover"
                      sizes="(max-width: 768px) 96px, 112px"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-[10px] md:text-[11px]">
                          <span className="font-medium uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                            {saved.brandName}
                          </span>
                          <span className="px-1 text-[var(--color-ink-300)]">·</span>
                          <span className="text-[var(--color-ink-500)]">
                            {CATEGORY_LABEL[saved.category]}
                          </span>
                        </p>
                        <Link
                          href={href}
                          className="mt-0.5 block line-clamp-1 text-[15px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)] hover:text-[var(--color-accent-800)] md:text-[16px]"
                        >
                          {saved.modelName}
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => wishlist.remove(saved.productId)}
                        aria-label={`Remove ${saved.modelName} from wishlist`}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--color-ink-400)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-danger-500)]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <p className="mt-auto pt-2 text-[16px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)] md:text-[17px]">
                      {saved.fromPriceRupees > 0 ? formatPrice(saved.fromPriceRupees) : "Price on request"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)]/60 px-3 py-2 md:px-4 md:py-2.5">
                  <ButtonLink
                    href={href}
                    variant="primary"
                    size="sm"
                    className={classNames("cta-arrow flex-1")}
                  >
                    View details
                  </ButtonLink>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
        <Heart size={28} strokeWidth={2} />
      </span>
      <h1 className="mt-5 font-headline text-2xl font-semibold tracking-tight text-[var(--color-ink-900)]">
        Nothing saved yet
      </h1>
      <p className="mt-2 text-sm text-[var(--color-ink-500)]">
        Tap the heart on any product to keep it here for later. Your saved list stays on your device.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <ButtonLink href="/shop" variant="primary" size="md" leadingIcon={<Search size={14} />}>
          Browse phones
        </ButtonLink>
        <ButtonLink href="/cart" variant="outline" size="md" leadingIcon={<ShoppingBag size={14} />}>
          Go to cart
        </ButtonLink>
      </div>
    </div>
  );
}
