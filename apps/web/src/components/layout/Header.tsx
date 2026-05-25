"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@store/shared";
import { Search, ShoppingBag, User } from "lucide-react";
import { CartDropdown } from "@/components/cart/CartDropdown";
import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/deals", label: "Deals" },
] as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cart = useCart();
  const pathname = usePathname() ?? "/";
  const { siteName } = useStoreSettings();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 4);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the cart whenever the visitor navigates. Navigation-driven UI
  // reset; `useEffectEvent` is still experimental in React 19.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation-driven UI reset
    setIsCartOpen(false);
  }, [pathname]);

  return (
    <header
      data-scrolled={isScrolled ? "true" : "false"}
      className={classNames(
        "scroll-header sticky top-0 hidden border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)]/85 backdrop-blur md:block",
        isCartOpen ? "z-[80]" : "z-30",
      )}
    >
      {isCartOpen && (
        <button
          type="button"
          onClick={() => setIsCartOpen(false)}
          aria-label="Close cart"
          className="animate-sheet-fade absolute inset-0 z-[1] cursor-default bg-[var(--color-ink-900)]/15"
        />
      )}
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="brand-lockup flex items-center gap-2.5 text-[var(--color-ink-900)]"
          aria-label={siteName}
        >
          <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
            <ShoppingBag size={16} strokeWidth={2.4} />
          </span>
          <span className="font-semibold text-2xl leading-none tracking-tight">{siteName}</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((navLink) => {
            const isActive = isNavActive(navLink.href, pathname);
            return (
              <Link
                key={navLink.href}
                href={navLink.href}
                aria-current={isActive ? "page" : undefined}
                className={classNames(
                  "rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
                    : "font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink-900)]",
                )}
              >
                {navLink.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search phones"
            className="inline-flex h-10 w-72 items-center gap-2 rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 text-sm text-[var(--color-ink-500)] transition-colors hover:border-[var(--color-ink-200)] hover:text-[var(--color-ink-700)]"
          >
            <Search size={15} />
            <span className="truncate">Search iPhone, Galaxy, Pixel…</span>
          </button>
          <Link
            href="/account"
            aria-label="Account"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]"
          >
            <User size={15} />
            <span>Account</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsCartOpen((previous) => !previous)}
            aria-label="Cart"
            aria-haspopup="dialog"
            aria-expanded={isCartOpen}
            className={classNames(
              "tap relative z-[2] inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              isCartOpen
                ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-800)] shadow-[var(--shadow-md)]"
                : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-800)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
            )}
          >
            <ShoppingBag size={15} />
            <span>Cart</span>
            {cart.itemCount > 0 && (
              <span
                key={cart.itemCount}
                className="animate-badge-pop ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-accent-500)] px-1 text-[11px] font-semibold text-[var(--color-ink-900)]"
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
