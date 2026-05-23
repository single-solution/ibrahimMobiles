"use client";

import { Search } from "lucide-react";
import { classNames } from "@store/shared";

export function CatalogSearchField({
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  "aria-label": string;
}) {
  return (
    <label className={classNames("relative flex h-8 items-center", className)}>
      <Search
        size={13}
        className="pointer-events-none absolute left-2 text-[var(--color-ink-400)]"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-full w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] pl-7 pr-2 text-xs text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-100)]"
      />
    </label>
  );
}

export function CatalogTabChip({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        isActive
          ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
          : "border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {label}
      <span
        className={classNames(
          "rounded-full px-1 text-[9px] tabular-nums",
          isActive
            ? "bg-[var(--color-accent-200)]/70 text-[var(--color-accent-800)]"
            : "bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]",
        )}
      >
        {count}
      </span>
    </button>
  );
}
