"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ShoppingBag, Tag, User } from "lucide-react";
import { classNames } from "@store/shared";

interface Tab {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  matchPaths: string[];
}

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: Home, matchPaths: ["/"] },
  { href: "/shop", label: "Shop", icon: ShoppingBag, matchPaths: ["/shop"] },
  { href: "/deals", label: "Deals", icon: Tag, matchPaths: ["/deals"] },
  { href: "/account", label: "Account", icon: User, matchPaths: ["/account"] },
];

export function MobileBottomTabBar() {
  const pathname = usePathname() ?? "/";

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 z-30 overflow-hidden rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas)] shadow-[var(--shadow-lg)] md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4px)" }}
    >
      <ul
        className="grid grid-cols-4"
        style={{ height: "var(--mobile-tabbar-h)" }}
      >
        {TABS.map((tab) => (
          <li key={tab.href} className="flex p-1.5">
            <TabLinkItem tab={tab} pathname={pathname} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function isLinkActive(href: string, matchPaths: string[], pathname: string): boolean {
  if (matchPaths.includes(pathname)) {
    return true;
  }
  if (href !== "/" && pathname.startsWith(href)) {
    return true;
  }
  return false;
}

interface TabLinkItemProps {
  tab: Tab;
  pathname: string;
}

function TabLinkItem({ tab, pathname }: TabLinkItemProps) {
  const isActive = isLinkActive(tab.href, tab.matchPaths, pathname);
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={classNames(
        "tap flex w-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-colors",
        isActive
          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
          : "font-medium text-[var(--color-ink-500)] active:text-[var(--color-ink-800)]",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
      <span className="leading-none">{tab.label}</span>
    </Link>
  );
}
