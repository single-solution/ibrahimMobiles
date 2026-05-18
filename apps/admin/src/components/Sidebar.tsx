"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  Boxes,
  Heart,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  Settings,
  Smartphone,
  Tags,
  Users,
  UsersRound,
} from "lucide-react";
import { classNames } from "@store/shared";

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  exact?: boolean;
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Sales",
    items: [
      { href: "/orders", label: "Orders", icon: Receipt },
      { href: "/inquiries", label: "Inquiries", icon: Inbox },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/loyalty", label: "Loyalty", icon: Heart },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/products", label: "Products", icon: Smartphone },
      { href: "/categories", label: "Categories", icon: Boxes },
      { href: "/brands", label: "Brands", icon: Tags },
      { href: "/offers", label: "Offers", icon: BadgePercent },
    ],
  },
  {
    title: "Storefront",
    items: [
      { href: "/media", label: "Media library", icon: ImageIcon },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/conversations", label: "AI conversations", icon: MessageSquare },
      { href: "/activity", label: "Activity log", icon: Activity },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/team", label: "Team & roles", icon: UsersRound },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className={classNames(
        "flex shrink-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition-[width] duration-200",
        isCollapsed ? "w-16" : "w-60",
      )}
    >
      <nav className="flex-1 overflow-y-auto py-3">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="mb-3">
            {!isCollapsed && (
              <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map((link) => {
                const isActive = link.exact
                  ? pathname === link.href
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      title={isCollapsed ? link.label : undefined}
                      className={classNames(
                        "flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] text-sm transition-colors",
                        isCollapsed ? "justify-center px-0" : "px-3",
                        isActive
                          ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
                          : "font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
                      )}
                    >
                      <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                      {!isCollapsed && <span>{link.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
