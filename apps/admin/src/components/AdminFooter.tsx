"use client";

import { useStoreSettings } from "@/lib/storeSettingsContext";

export function AdminFooter() {
  const { siteName } = useStoreSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="hidden h-10 shrink-0 items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-4 text-[11px] text-[var(--color-ink-500)] shadow-[var(--shadow-sm)] md:flex">
      <p>
        © {year} {siteName} — Admin console
      </p>
      <div className="flex items-center gap-3">
        <span className="hidden md:inline">All systems normal</span>
        <span className="grid size-1.5 shrink-0 place-items-center rounded-full bg-emerald-500" aria-hidden />
        <span className="font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]">v1.0</span>
      </div>
    </footer>
  );
}
