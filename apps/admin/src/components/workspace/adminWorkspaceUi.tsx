"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { classNames } from "@store/shared";
import { Button } from "@/components/ui/Button";

/** AdminShell contentClassName for split-pane workspaces (orders, customers, inquiries). */
export const adminWorkspacePageClass =
  "flex min-h-0 flex-1 flex-col overflow-hidden p-1.5 md:p-2";

/** AdminShell contentClassName for scrollable catalog workspaces (products, categories). */
export const adminCatalogPageClass =
  "flex min-h-0 flex-1 flex-col overflow-y-auto p-1.5 md:p-2";

/** AdminShell contentClassName for single-pane list workspaces (team, offers, activity). */
export const adminListPageClass = adminCatalogPageClass;

export function WorkspaceFrame({
  children,
  className,
  minHeight = true,
}: {
  children: ReactNode;
  className?: string;
  minHeight?: boolean;
}) {
  return (
    <div
      className={classNames(
        "flex flex-1 flex-col overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]",
        minHeight && "min-h-[min(72vh,680px)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function WorkspaceSidebarNavItem({
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
    <li>
      <button
        type="button"
        onClick={onClick}
        className={classNames(
          "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-xs transition-colors",
          isActive
            ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-900)]"
            : "text-[var(--color-ink-700)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink-900)]",
        )}
      >
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-[10px] opacity-70">{count}</span>
      </button>
    </li>
  );
}

export function WorkspaceFilterChip({
  label,
  count,
  isActive,
  onClick,
  compact,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex items-center gap-1 font-semibold transition-colors",
        compact
          ? "rounded-full px-2 py-0.5 text-[10px]"
          : "rounded-full px-2.5 py-1 text-[11px]",
        isActive
          ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
          : "border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-600)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {label}
      {typeof count === "number" ? (
        <span
          className={classNames(
            "rounded-full px-1 tabular-nums text-[9px]",
            isActive
              ? "bg-[var(--color-accent-200)]/70 text-[var(--color-accent-800)]"
              : "bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function WorkspaceSearchField({
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

export function WorkspacePaneHeader({
  icon: Icon,
  title,
  subtitle,
  search,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  search?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="shrink-0 space-y-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <Icon size={15} className="shrink-0 text-[var(--color-accent-700)]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">{title}</h2>
          {subtitle ? (
            <p className="text-[10px] text-[var(--color-ink-500)]">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {search}
    </header>
  );
}

export function WorkspaceEmptyPane({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
        <Icon size={24} />
      </span>
      <p className="mt-4 text-sm font-semibold text-[var(--color-ink-900)]">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--color-ink-500)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function WorkspaceListHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)]">
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">{title}</h2>
          {subtitle ? (
            <p className="text-[10px] text-[var(--color-ink-500)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}

export function WorkspaceRowIconButton({
  label,
  onClick,
  icon: Icon,
  tone = "default",
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "grid size-8 place-items-center rounded-[var(--radius-md)] transition-colors disabled:opacity-40",
        tone === "danger"
          ? "text-rose-500 hover:bg-rose-50 hover:text-rose-600"
          : "text-[var(--color-ink-500)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
      )}
    >
      <Icon size={13} />
    </button>
  );
}

export function WorkspacePrimaryAction({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <Button
      variant="primary"
      size="sm"
      leadingIcon={Icon ? <Icon size={14} /> : undefined}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
