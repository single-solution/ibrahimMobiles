"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";
import { CartDropdown } from "@/components/cart/CartDropdown";
import { useCart } from "@/lib/cart/useCart";
import { classNames } from "@store/shared";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

interface MobileHeaderProps {
  onOpenSearch: () => void;
}

export function MobileHeader({ onOpenSearch }: MobileHeaderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const cart = useCart();
  const { siteName, brandLogoLight, brandLogoDark } = useStoreSettings();

  // Close the cart whenever the visitor navigates. Navigation-driven UI
  // reset; `useEffectEvent` is still experimental in React 19.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset
    setIsCartOpen(false);
  }, [pathname]);

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
         colour is animated by `.scroll-header[data-scrolled]`. */
      className={classNames(
        "scroll-header sticky top-0 border-b safe-top md:hidden",
        isCartOpen ? "z-[80]" : "z-30",
      )}
      style={{ height: "var(--mobile-header-h)" }}
    >
      {isCartOpen && (
        <button
          type="button"
          onClick={() => setIsCartOpen(false)}
          aria-label="Close cart"
          className="animate-sheet-fade absolute inset-0 z-[1] cursor-default bg-[var(--color-ink-900)]/15"
        />
      )}
      <div className="flex h-full items-center gap-2 px-4">
        <BrandLockup
          href="/"
          siteName={siteName}
          logoUrl={brandLogoLight || brandLogoDark}
          tone="light"
          size="sm"
        />

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search phones"
            className="tap grid size-10 place-items-center rounded-[var(--radius-full)] text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
          >
            <Search size={20} />
          </button>
          <Link
            href="/account"
            aria-label="Account"
            className="tap grid size-10 place-items-center rounded-[var(--radius-full)] text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
          >
            <User size={20} />
          </Link>
          <button
            type="button"
            onClick={() => setIsCartOpen((previous) => !previous)}
            aria-label="Cart"
            aria-haspopup="dialog"
            aria-expanded={isCartOpen}
            className={classNames(
              "tap relative z-[2] grid size-10 place-items-center rounded-[var(--radius-full)] transition-colors active:bg-[var(--color-surface-muted)]",
              isCartOpen
                ? "bg-[var(--color-accent-50)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-ink-700)]",
            )}
          >
            <ShoppingBag size={20} />
            {cart.itemCount > 0 && (
              <span
                key={cart.itemCount}
                className="animate-badge-pop absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-500)] text-[10px] font-semibold text-[var(--color-ink-900)]"
              >
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <CartDropdown open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}
