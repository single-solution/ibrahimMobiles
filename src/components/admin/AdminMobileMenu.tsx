"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ExternalLink, LogOut, ShoppingBag } from "lucide-react";
import { Flyout } from "@/components/ui/Flyout";
import { SIDEBAR_SECTIONS } from "@/components/admin/Sidebar";
import { ADMIN_SESSION_KEY, ADMIN_USER } from "@/components/admin/adminSession";
import { SITE_NAME } from "@/lib/constants";
import { classNames } from "@/lib/utils";

interface AdminMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileMenu({ isOpen, onClose }: AdminMobileMenuProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    onClose();
    router.push("/admin/login");
  }

  return (
    <Flyout isOpen={isOpen} onClose={onClose} side="left" width="md" showCloseButton={false}>
      <div className="-mx-4 -mt-4 flex items-center gap-2.5 border-b border-[var(--color-ink-100)] px-4 py-3.5">
        <span className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-700)] text-white">
          <ShoppingBag size={15} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
            Admin
          </p>
          <p className="truncate text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
            {SITE_NAME.split(" ")[0]} HQ
          </p>
        </div>
      </div>

      <nav className="mt-3">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="mb-3">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={classNames(
                        "flex h-10 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 text-[14px]",
                        isActive
                          ? "bg-[var(--color-accent-700)] text-white shadow-[var(--shadow-sm)]"
                          : "text-[var(--color-ink-800)] active:bg-[var(--color-canvas-deep)]",
                      )}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
                      <span className="font-medium">{item.label}</span>
                      <ChevronRight
                        size={14}
                        className={classNames(
                          "ml-auto",
                          isActive ? "text-white/70" : "text-[var(--color-ink-300)]",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-3 border-t border-[var(--color-ink-100)] pt-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 text-[13px] font-medium text-[var(--color-ink-700)] active:bg-[var(--color-canvas-deep)]"
        >
          <ExternalLink size={14} />
          View storefront
        </Link>

        <div className="mt-2 flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-accent-700)] text-[12px] font-semibold text-white">
            {ADMIN_USER.initials}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-[var(--color-ink-900)]">
              {ADMIN_USER.name}
            </p>
            <p className="truncate text-[11px] text-[var(--color-ink-500)]">{ADMIN_USER.role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--color-ink-500)] active:bg-[var(--color-surface)]"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </Flyout>
  );
}
