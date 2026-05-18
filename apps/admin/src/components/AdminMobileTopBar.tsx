"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, ExternalLink, Menu, ShoppingBag } from "lucide-react";

import { getInitials } from "@/lib/initials";
import { useStoreSettings } from "@/lib/storeSettingsContext";

interface AdminMobileTopBarProps {
  onOpenMenu: () => void;
}

export function AdminMobileTopBar({ onOpenMenu }: AdminMobileTopBarProps) {
  const { data: session } = useSession();
  const { siteName } = useStoreSettings();
  const initials = getInitials(session?.user?.name);
  const brandShort = siteName.split(" ")[0];

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)]/85 px-3 backdrop-blur md:hidden safe-top"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open admin menu"
        className="grid size-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] active:bg-[var(--color-canvas-deep)]"
      >
        <Menu size={20} />
      </button>

      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 text-[var(--color-ink-900)]"
      >
        <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
          <ShoppingBag size={14} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Admin
          </p>
          <p className="truncate text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
            {brandShort} HQ
          </p>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View storefront"
          className="grid size-10 place-items-center rounded-full text-[var(--color-ink-600)] active:bg-[var(--color-canvas-deep)]"
        >
          <ExternalLink size={17} />
        </Link>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid size-10 place-items-center rounded-full text-[var(--color-ink-600)] active:bg-[var(--color-canvas-deep)]"
        >
          <Bell size={18} />
          <span className="absolute right-2 top-2 grid size-3.5 place-items-center rounded-full bg-[var(--color-accent-500)] text-[8px] font-bold text-[var(--color-ink-900)]">
            3
          </span>
        </button>
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-[var(--color-accent-500)] text-[11px] font-semibold text-[var(--color-ink-900)]"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
