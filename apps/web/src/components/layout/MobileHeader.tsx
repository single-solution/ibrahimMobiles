"use client";

import { useEffect, useState } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { classNames } from "@store/shared";
import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

interface MobileHeaderProps {
  onOpenSearch: () => void;
  onOpenCart: () => void;
  isCartOpen: boolean;
}

export function MobileHeader({ onOpenSearch, onOpenCart, isCartOpen }: MobileHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const cart = useCart();
  const { siteName, brandLogoLight, brandLogoDark } = useStoreSettings();

  // Mirror the desktop header's frosted-on-scroll behaviour so the
  // mobile header dissolves into the hero gradient at the top of the
  // page and only firms up once content scrolls underneath it. Passive
  // listener so the scroll thread stays cheap.
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 4);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      data-scrolled={isScrolled ? "true" : "false"}
      /* `.scroll-header` (in globals.css) supplies the real
         `backdrop-filter` frosted-glass background. At the top of the
         page the header is near-transparent so the hero gradient shows
         through; on scroll it picks up a stronger tint, ink-100 border
         and shadow. The `border-b` class only declares the side; the
         colour is animated by `.scroll-header[data-scrolled]`. The
         z-elevation matches the desktop header: when the cart opens we
         rise above the cart backdrop (z-[60]) so the trigger button's
         active highlight stays visible — same effect users see on md+. */
      className={classNames(
        "scroll-header sticky top-0 border-b safe-top md:hidden",
        isCartOpen ? "z-[80]" : "z-30",
      )}
      style={{ height: "var(--mobile-header-h)" }}
    >
      {isCartOpen && (
        <button
          type="button"
          onClick={onOpenCart}
          aria-hidden
          tabIndex={-1}
          className="animate-sheet-fade pointer-events-none absolute inset-0 z-[1] cursor-default bg-[var(--color-ink-900)]/15"
        />
      )}
      <div className="relative z-[2] flex h-full items-center gap-1 px-3">
        <BrandLockup
          href="/"
          siteName={siteName}
          logoUrl={brandLogoLight || brandLogoDark}
          tone="light"
          size="sm"
        />

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search products"
          className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--color-ink-800)] active:bg-[var(--color-surface-muted)]"
        >
          <Search size={14} />
          <span>Search</span>
        </button>
        <button
          type="button"
          onClick={onOpenCart}
          aria-label="Cart"
          aria-haspopup="dialog"
          aria-expanded={isCartOpen}
          className={classNames(
            "tap relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
            isCartOpen
              ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
              : "border-transparent text-[var(--color-ink-800)] active:bg-[var(--color-surface-muted)]",
          )}
        >
          <ShoppingBag size={14} />
          <span>Cart</span>
          {cart.itemCount > 0 && (
            <span
              key={cart.itemCount}
              className="animate-badge-pop ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-accent-500)] px-1 text-[10px] font-bold text-[var(--color-ink-900)]"
            >
              {cart.itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
