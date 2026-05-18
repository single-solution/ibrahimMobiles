"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, User } from "lucide-react";
import { CartDropdown } from "@/components/cart/CartDropdown";
import { useCart } from "@/lib/cart/useCart";
import { classNames } from "@store/shared";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

interface MobileHeaderProps {
  onOpenSearch: () => void;
}

export function MobileHeader({ onOpenSearch }: MobileHeaderProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const pathname = usePathname();
  const cart = useCart();
  const { siteName } = useStoreSettings();

  // Close the cart whenever the visitor navigates. Navigation-driven UI
  // reset; `useEffectEvent` is still experimental in React 19.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset
    setIsCartOpen(false);
  }, [pathname]);

  return (
    <header
      className={classNames(
        "sticky top-0 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] shadow-[var(--shadow-sm)] safe-top md:hidden",
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
        <Link
          href="/"
          aria-label={siteName}
          className="brand-lockup flex items-center gap-2 text-[var(--color-ink-900)]"
        >
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
            <ShoppingBag size={14} strokeWidth={2.6} />
          </span>
          <span className="font-semibold text-lg leading-none tracking-tight">{siteName}</span>
        </Link>

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
                className="animate-badge-pop absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-600)] text-[10px] font-semibold text-white"
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
