"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist/useWishlist";
import { classNames, type ProductCategory } from "@store/shared";

interface WishlistButtonProps {
  productId: string;
  productSlug: string;
  modelName: string;
  brandSlug: string;
  brandName: string;
  imageUrl: string;
  category: ProductCategory;
  fromPriceRupees: number;
  /** Visual variant — `card` is for floating on a product card, `inline` for action rows. */
  variant?: "card" | "inline";
  size?: "sm" | "md";
}

/**
 * Toggle a product in/out of the wishlist. Stops Link navigation so the
 * button can sit inside a `<Link>` wrapper without sending the customer
 * to the detail page when they tap the heart.
 */
export function WishlistButton({
  productId,
  productSlug,
  modelName,
  brandSlug,
  brandName,
  imageUrl,
  category,
  fromPriceRupees,
  variant = "card",
  size = "sm",
}: WishlistButtonProps) {
  const wishlist = useWishlist();
  const saved = wishlist.has(productId);

  const sizeClass =
    size === "md"
      ? "size-9 [--icon-size:16px]"
      : "size-7 [--icon-size:14px] md:size-8";

  const baseClass =
    variant === "card"
      ? classNames(
          "absolute left-1.5 top-1.5 z-20 grid place-items-center rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)]/90 backdrop-blur-sm shadow-[var(--shadow-sm)] transition-colors md:left-3 md:top-3",
          saved
            ? "text-[var(--color-danger-500)]"
            : "text-[var(--color-ink-500)] hover:text-[var(--color-danger-500)]",
        )
      : classNames(
          "inline-flex items-center justify-center rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] transition-colors",
          saved
            ? "text-[var(--color-danger-500)]"
            : "text-[var(--color-ink-500)] hover:text-[var(--color-danger-500)]",
        );

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${modelName} from wishlist` : `Save ${modelName} to wishlist`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        wishlist.toggle({
          productId,
          productSlug,
          modelName,
          brandSlug,
          brandName,
          imageUrl,
          category,
          fromPriceRupees,
        });
      }}
      className={classNames(baseClass, sizeClass)}
    >
      <Heart
        size={size === "md" ? 16 : 14}
        strokeWidth={2.2}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
