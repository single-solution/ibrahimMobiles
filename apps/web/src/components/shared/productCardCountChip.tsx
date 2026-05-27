"use client";

import { Award } from "lucide-react";
import type { ReactNode } from "react";

export function ProductListingCountChip({
  label,
}: {
  label: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-[58%] flex-wrap items-center justify-end gap-x-1 gap-y-0.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium leading-tight text-[var(--color-ink-700)] md:max-w-none md:gap-1 md:px-2 md:py-0.5 md:text-[11px]">
      <Award size={9} className="shrink-0 md:size-[11px]" aria-hidden />
      <span className="min-w-0">{label}</span>
    </span>
  );
}
