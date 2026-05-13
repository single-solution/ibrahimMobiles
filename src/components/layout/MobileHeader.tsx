"use client";

import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

interface MobileHeaderProps {
  onOpenSearch: () => void;
}

export function MobileHeader({ onOpenSearch }: MobileHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)]/90 backdrop-blur safe-top md:hidden"
      style={{ height: "var(--mobile-header-h)" }}
    >
      <div className="flex h-full items-center gap-2 px-4">
        <Link
          href="/"
          aria-label={SITE_NAME}
          className="flex items-center gap-2 text-[var(--color-ink-900)]"
        >
          <span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-700)] text-white">
            <ShoppingBag size={14} strokeWidth={2.6} />
          </span>
          <span className="font-semibold text-lg leading-none tracking-tight">{SITE_NAME}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search phones"
            className="grid size-10 place-items-center rounded-[var(--radius-full)] text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
          >
            <Search size={20} />
          </button>
          <button
            type="button"
            aria-label="Cart"
            className="relative grid size-10 place-items-center rounded-[var(--radius-full)] text-[var(--color-ink-700)] active:bg-[var(--color-surface-muted)]"
          >
            <ShoppingBag size={20} />
            <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[var(--color-accent-600)] text-[10px] font-semibold text-white">
              2
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
