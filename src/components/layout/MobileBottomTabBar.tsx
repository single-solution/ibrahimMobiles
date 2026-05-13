"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Menu, ShoppingBag, Tag } from "lucide-react";
import { classNames } from "@/lib/utils";

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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul
        className="grid grid-cols-5"
        style={{ height: "var(--mobile-tabbar-h)" }}
      >
        {tabs.map((tab) => (
          <li key={tab.label} className="flex">
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
        "relative flex w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        isActive
          ? "text-[var(--color-accent-700)]"
          : "text-[var(--color-ink-500)] active:text-[var(--color-ink-800)]",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {isActive && (
        <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-[var(--color-accent-600)]" />
      )}
      <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
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
        "relative flex w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        tab.isActive
          ? "text-[var(--color-accent-700)]"
          : "text-[var(--color-ink-500)] active:text-[var(--color-ink-800)]",
      )}
      aria-pressed={tab.isActive}
    >
      {tab.isActive && (
        <span className="absolute inset-x-6 top-0 h-0.5 rounded-b-full bg-[var(--color-accent-600)]" />
      )}
      <Icon size={22} strokeWidth={tab.isActive ? 2.4 : 2} />
      <span className="leading-none">{tab.label}</span>
    </button>
  );
}
