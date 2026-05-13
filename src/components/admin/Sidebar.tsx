"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Award,
  BadgePercent,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Quote,
  Settings,
  ShoppingBag,
  Smartphone,
  Tags,
  Users,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";
import { ADMIN_SESSION_KEY, ADMIN_USER } from "@/components/admin/adminSession";

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

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Smartphone },
      { href: "/admin/brands", label: "Brands", icon: Tags },
      { href: "/admin/offers", label: "Offers", icon: BadgePercent },
      { href: "/admin/taxonomies", label: "Taxonomies", icon: Award },
      { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/inquiries", label: "Inquiries", icon: Inbox },
      { href: "/admin/conversations", label: "AI conversations", icon: MessageSquare },
      { href: "/admin/activity", label: "Activity log", icon: Activity },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/media", label: "Media library", icon: ImageIcon },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Team",
    items: [
      { href: "/admin/team", label: "Team & roles", icon: Users },
    ],
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    router.push("/admin/login");
  }

  return (
    <aside
      className={classNames(
        "flex h-screen shrink-0 flex-col border-r border-[var(--color-ink-100)] bg-[var(--color-surface)] transition-[width] duration-200",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={classNames(
          "flex h-16 items-center border-b border-[var(--color-ink-100)]",
          isCollapsed ? "justify-center px-0" : "justify-between px-4",
        )}
      >
        <Link href="/admin" className="flex items-center gap-2.5 text-[var(--color-ink-900)]">
          <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-700)] text-white">
            <ShoppingBag size={15} strokeWidth={2.4} />
          </span>
          {!isCollapsed && (
            <div className="leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
                Admin
              </p>
              <p className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
                {SITE_NAME.split(" ")[0]} HQ
              </p>
            </div>
          )}
        </Link>
        {!isCollapsed && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={onToggleCollapsed}
            className="grid size-7 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
          >
            <ChevronsLeft size={14} />
          </button>
        )}
      </div>

      {isCollapsed && (
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={onToggleCollapsed}
          className="mx-auto mt-2 grid size-7 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <ChevronsRight size={14} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-3">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="mb-3">
            {!isCollapsed && (
              <p className="px-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5 px-2">
              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={classNames(
                        "flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] text-sm transition-colors",
                        isCollapsed ? "justify-center px-0" : "px-3",
                        isActive
                          ? "bg-[var(--color-accent-700)] text-white shadow-[var(--shadow-sm)]"
                          : "text-[var(--color-ink-700)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
                      )}
                    >
                      <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <SidebarFooter isCollapsed={isCollapsed} onLogout={handleLogout} />
    </aside>
  );
}

interface SidebarFooterProps {
  isCollapsed: boolean;
  onLogout: () => void;
}

function SidebarFooter({ isCollapsed, onLogout }: SidebarFooterProps) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-[var(--color-ink-100)] py-2">
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--color-accent-500)]" />
        </button>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View storefront"
          title="View storefront"
          className="grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <ExternalLink size={14} />
        </Link>
        <span
          title={`${ADMIN_USER.name} · ${ADMIN_USER.role}`}
          className="grid size-8 place-items-center rounded-full bg-[var(--color-accent-700)] text-[11px] font-semibold text-white"
        >
          {ADMIN_USER.initials}
        </span>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="grid size-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 border-t border-[var(--color-ink-100)] p-3">
      <button
        type="button"
        className="flex h-9 w-full items-center gap-2.5 rounded-[var(--radius-md)] px-3 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
      >
        <span className="relative">
          <Bell size={14} />
          <span className="absolute -right-1 -top-0.5 grid size-3.5 place-items-center rounded-full bg-[var(--color-accent-500)] text-[8px] font-bold text-white">
            3
          </span>
        </span>
        Notifications
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
          3 new
        </span>
      </button>
      <Link
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-9 items-center gap-2.5 rounded-[var(--radius-md)] px-3 text-xs font-medium text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
      >
        <ExternalLink size={14} />
        View storefront
      </Link>

      <div className="mt-2 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas)] p-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-700)] text-[12px] font-semibold text-white">
          {ADMIN_USER.initials}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
            {ADMIN_USER.name}
          </p>
          <p className="truncate text-[11px] text-[var(--color-ink-500)]">
            {ADMIN_USER.role} · {ADMIN_USER.email}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] transition-colors hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]"
        >
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );
}
