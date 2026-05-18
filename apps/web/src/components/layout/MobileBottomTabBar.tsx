"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Menu, ShoppingBag, Tag } from "lucide-react";
import { classNames } from "@store/shared";

interface MobileBottomTabBarProps {
  onOpenMenu: () => void;
  isMenuOpen: boolean;
}

interface TabLink {
  kind: "link";
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  matchPaths: string[];
}

interface TabAction {
  kind: "action";
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  isActive: boolean;
  onClick: () => void;
}

type Tab = TabLink | TabAction;

export function MobileBottomTabBar({ onOpenMenu, isMenuOpen }: MobileBottomTabBarProps) {
  const pathname = usePathname() ?? "/";

  const tabs: Tab[] = [
    {
      kind: "link",
      href: "/",
      label: "Home",
      icon: Home,
      matchPaths: ["/"],
    },
    {
      kind: "link",
      href: "/shop",
      label: "Shop",
      icon: ShoppingBag,
      matchPaths: ["/shop"],
    },
    {
      kind: "link",
      href: "/deals",
      label: "Deals",
      icon: Tag,
      matchPaths: ["/deals"],
    },
    {
      kind: "link",
      href: "/wishlist",
      label: "Saved",
      icon: Heart,
      matchPaths: ["/wishlist"],
    },
    {
      kind: "action",
      label: "Menu",
      icon: Menu,
      isActive: isMenuOpen,
      onClick: onOpenMenu,
    },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 z-30 overflow-hidden rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas)] shadow-[var(--shadow-lg)] md:hidden"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <ul
        className="grid grid-cols-5"
        style={{ height: "var(--mobile-tabbar-h)" }}
      >
        {tabs.map((tab) => (
          <li key={tab.label} className="flex p-1.5">
            {tab.kind === "link" ? (
              <TabLinkItem tab={tab} pathname={pathname} />
            ) : (
              <TabActionItem tab={tab} />
            )}
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
  tab: TabLink;
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

interface TabActionItemProps {
  tab: TabAction;
}

function TabActionItem({ tab }: TabActionItemProps) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={tab.onClick}
      className={classNames(
        "tap flex w-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] transition-colors",
        tab.isActive
          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
          : "font-medium text-[var(--color-ink-500)] active:text-[var(--color-ink-800)]",
      )}
      aria-pressed={tab.isActive}
    >
      <Icon size={20} strokeWidth={tab.isActive ? 2.4 : 2} />
      <span className="leading-none">{tab.label}</span>
    </button>
  );
}
