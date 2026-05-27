"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@store/shared";
import { Search, ShoppingBag, User } from "lucide-react";
import { BrandLockup } from "@/components/layout/BrandLockup";
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
  onOpenCart: () => void;
  isCartOpen: boolean;
}

export function Header({ onOpenSearch, onOpenCart, isCartOpen }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const cart = useCart();
  const pathname = usePathname() ?? "/";
  const { siteName, brandLogoLight, brandLogoDark } = useStoreSettings();

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
      /* `.scroll-header` (in globals.css) owns the frosted-glass look:
         real `backdrop-filter` + a near-transparent canvas tint at the
         top of the page so the header dissolves into the hero gradient,
         then a stronger 20px / 160%-saturation blur + ink-100 border +
         soft shadow once content scrolls under it. The `border-b` class
         only carves out the bottom border; the *color* is animated by
         the global stylesheet. */
      className={classNames(
        "scroll-header sticky top-0 hidden border-b md:block",
        isCartOpen ? "z-[80]" : "z-30",
      )}
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
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <BrandLockup
          href="/"
          siteName={siteName}
          logoUrl={brandLogoLight || brandLogoDark}
          tone="light"
          size="md"
        />

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
            aria-label="Search products"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-full border border-transparent px-3.5 text-sm font-medium text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-200)] hover:text-[var(--color-ink-900)] focus-visible:border-[var(--color-ink-200)] focus-visible:text-[var(--color-ink-900)] focus-visible:outline-none"
          >
            <Search size={15} />
            <span>Search</span>
          </button>
          <Link
            href="/account"
            aria-label="Account"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-full border border-transparent px-3.5 text-sm font-medium text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-200)] hover:text-[var(--color-ink-900)] focus-visible:border-[var(--color-ink-200)] focus-visible:text-[var(--color-ink-900)] focus-visible:outline-none"
          >
            <User size={15} />
            <span>Account</span>
          </Link>
          <button
            type="button"
            onClick={onOpenCart}
            aria-label="Cart"
            aria-haspopup="dialog"
            aria-expanded={isCartOpen}
            className={classNames(
              "tap relative z-[2] inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none",
              isCartOpen
                ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
                : "border-transparent text-[var(--color-ink-800)] hover:border-[var(--color-ink-200)] hover:text-[var(--color-ink-900)] focus-visible:border-[var(--color-ink-200)] focus-visible:text-[var(--color-ink-900)]",
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
    </header>
  );
}
