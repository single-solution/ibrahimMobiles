"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@store/shared";
import {
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CartDropdown } from "@/components/cart/CartDropdown";
import { useCart } from "@/lib/cart/useCart";
import { useStoreSettings } from "@/lib/storefront/storeSettingsContext";
import { useWishlist } from "@/lib/wishlist/useWishlist";

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cart = useCart();
  const wishlist = useWishlist();
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

  function handleMobileNavToggle() {
    setIsMobileNavOpen((previous) => !previous);
  }

  function handleMobileNavClose() {
    setIsMobileNavOpen(false);
  }

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
          onClick={handleMobileNavClose}
          aria-label={siteName}
        >
          <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
            <ShoppingBag size={16} strokeWidth={2.4} />
          </span>
          <span className="font-semibold text-2xl leading-none tracking-tight">{siteName}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
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
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3.5 text-sm font-medium text-[var(--color-ink-800)] transition-colors hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]"
          >
            <Heart size={15} />
            <span>Wishlist</span>
            {wishlist.itemCount > 0 && (
              <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-accent-500)] px-1 text-[11px] font-semibold text-[var(--color-ink-900)]">
                {wishlist.itemCount}
              </span>
            )}
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
          <button
            type="button"
            aria-label={isMobileNavOpen ? "Close menu" : "Open menu"}
            onClick={handleMobileNavToggle}
            className="grid size-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] hover:bg-[var(--color-surface-muted)] md:hidden"
          >
            {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <MobileNav
        isOpen={isMobileNavOpen}
        onLinkClick={handleMobileNavClose}
        onOpenSearch={onOpenSearch}
        pathname={pathname}
      />

      <CartDropdown open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </header>
  );
}

interface MobileNavProps {
  isOpen: boolean;
  onLinkClick: () => void;
  onOpenSearch: () => void;
  pathname: string;
}

function MobileNav({ isOpen, onLinkClick, onOpenSearch, pathname }: MobileNavProps) {
  return (
    <div
      className={classNames(
        "overflow-hidden border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] transition-all duration-200 md:hidden",
        isOpen ? "max-h-96" : "max-h-0",
      )}
    >
      <div className="flex flex-col gap-1 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => {
            onLinkClick();
            onOpenSearch();
          }}
          className="flex h-11 w-full items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] px-3 text-left text-sm text-[var(--color-ink-500)] md:hidden"
        >
          <Search size={16} />
          <span>Search phones…</span>
        </button>
        {NAV_LINKS.map((navLink) => {
          const isActive = isNavActive(navLink.href, pathname);
          return (
            <Link
              key={navLink.href}
              href={navLink.href}
              onClick={onLinkClick}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                "rounded-[var(--radius-md)] px-3 py-2.5 text-sm",
                isActive
                  ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
                  : "font-medium text-[var(--color-ink-800)] hover:bg-[var(--color-surface-muted)]",
              )}
            >
              {navLink.label}
            </Link>
          );
        })}
        <Button variant="primary" size="md" className="mt-2 w-full" onClick={onLinkClick}>
          Browse all phones
        </Button>
      </div>
    </div>
  );
}
