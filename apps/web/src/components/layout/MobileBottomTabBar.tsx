"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, ShoppingCart, Tag, User } from "lucide-react";
import { classNames } from "@store/shared";
import { useCart } from "@/lib/cart/useCart";
import { usePrefetchOnIntent } from "@/lib/navigation/usePrefetchOnIntent";
import { useShopHref } from "@/lib/storefront/storefrontReferenceContext";

interface Tab {
  // `matchBase` drives active highlighting (e.g. every `/shop/*` route lights
  // up Shop); `href` is the actual destination, which Shop resolves at render
  // to the first category so the tap skips the `/shop` redirect.
  matchBase: string;
  href?: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  matchPaths: string[];
  showCartBadge?: boolean;
}

const TABS: Tab[] = [
  { matchBase: "/", label: "Home", icon: Home, matchPaths: ["/"] },
  { matchBase: "/shop", label: "Shop", icon: ShoppingBag, matchPaths: ["/shop"] },
  { matchBase: "/deals", label: "Deals", icon: Tag, matchPaths: ["/deals"] },
  { matchBase: "/cart", label: "Cart", icon: ShoppingCart, matchPaths: ["/cart"], showCartBadge: true },
  { matchBase: "/account", label: "Account", icon: User, matchPaths: ["/account"] },
];

export function MobileBottomTabBar() {
  const pathname = usePathname() ?? "/";
  const shopHref = useShopHref();
  const { itemCount } = useCart();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 z-30 overflow-hidden rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas)] shadow-[var(--shadow-lg)] md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
    >
      <ul
        className="grid grid-cols-5"
        style={{ height: "var(--mobile-tabbar-h)" }}
      >
        {TABS.map((tab) => (
          <li key={tab.matchBase} className="flex p-1.5">
            <TabLinkItem
              tab={tab}
              href={tab.matchBase === "/shop" ? shopHref : tab.href ?? tab.matchBase}
              pathname={pathname}
              badgeCount={tab.showCartBadge ? itemCount : 0}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function isLinkActive(matchBase: string, matchPaths: string[], pathname: string): boolean {
  if (matchPaths.includes(pathname)) {
    return true;
  }
  if (matchBase !== "/" && pathname.startsWith(matchBase)) {
    return true;
  }
  return false;
}

interface TabLinkItemProps {
  tab: Tab;
  href: string;
  pathname: string;
  badgeCount: number;
}

function TabLinkItem({ tab, href, pathname, badgeCount }: TabLinkItemProps) {
  const isActive = isLinkActive(tab.matchBase, tab.matchPaths, pathname);
  const Icon = tab.icon;
  const prefetchHandlers = usePrefetchOnIntent(isActive ? null : href);
  return (
    <Link
      href={href}
      className={classNames(
        "tap focus-ring-inset flex w-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-colors",
        isActive
          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
          : "font-medium text-[var(--color-ink-500)] active:text-[var(--color-ink-800)]",
      )}
      aria-current={isActive ? "page" : undefined}
      onPointerDown={prefetchHandlers.onPointerDown}
      onTouchStart={prefetchHandlers.onTouchStart}
      onFocus={prefetchHandlers.onFocus}
    >
      <span className="relative">
        <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
        {badgeCount > 0 && (
          <span
            key={badgeCount}
            className="animate-badge-pop absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-accent-500)] px-1 text-[10px] font-bold text-[var(--color-ink-900)]"
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </span>
      <span className="leading-none">{tab.label}</span>
    </Link>
  );
}
