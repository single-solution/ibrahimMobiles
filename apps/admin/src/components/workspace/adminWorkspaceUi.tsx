"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Search } from "lucide-react";
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
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center md:px-6 md:py-12">
      <span className="grid size-12 place-items-center rounded-full bg-[var(--color-accent-50)] text-[var(--color-accent-700)] md:size-14">
        <Icon size={20} className="md:hidden" />
        <Icon size={24} className="hidden md:block" />
      </span>
      <p className="mt-3 text-[13px] font-semibold text-[var(--color-ink-900)] md:mt-4 md:text-sm">
        {title}
      </p>
      <p className="mt-1 max-w-xs text-[11.5px] leading-relaxed text-[var(--color-ink-500)] md:text-xs">
        {description}
      </p>
      {action ? <div className="mt-3 md:mt-4">{action}</div> : null}
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
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 py-2 md:gap-3 md:px-4 md:py-3">
      <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] md:size-9">
          <Icon size={14} className="md:hidden" />
          <Icon size={16} className="hidden md:block" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-[var(--color-ink-900)] md:text-sm">
            {title}
          </h2>
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
  disabled,
}: {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="primary"
      size="sm"
      leadingIcon={Icon ? <Icon size={14} /> : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
}

export function WorkspaceReadOnlyBanner({ message }: { message: string }) {
  return (
    <p className="border-b border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] px-3 py-2 text-center text-[11px] text-[var(--color-ink-600)]">
      {message}
    </p>
  );
}

/** Catalog workspace main column header (products, categories tables). */
export function WorkspaceCatalogPaneHeader({
  title,
  subtitle,
  search,
  filters,
  action,
}: {
  title: ReactNode;
  subtitle?: string;
  search?: ReactNode;
  filters?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="shrink-0 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5 sm:mr-auto">{title}</div>
        <div className="flex w-full min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:flex-nowrap">
          {search}
          {action}
        </div>
      </div>
      {subtitle ? (
        <p className="mt-1 text-[10px] text-[var(--color-ink-500)]">{subtitle}</p>
      ) : null}
      {filters ? <div className="mt-2 flex flex-wrap gap-1.5">{filters}</div> : null}
    </header>
  );
}

/** Split-pane detail column header (orders, customers, inquiries). */
export function WorkspaceDetailHeader({
  onBack,
  backLabel,
  title,
  subtitle,
  badge,
  actions,
}: {
  onBack?: () => void;
  backLabel?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 flex-wrap items-start gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 py-2 md:gap-3 md:px-4 md:py-3">
      {onBack ? (
        <button
          type="button"
          aria-label={backLabel ?? "Back to list"}
          onClick={onBack}
          className="grid size-8 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-600)] hover:bg-[var(--color-canvas-deep)] lg:hidden"
        >
          <ArrowLeft size={16} />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-[var(--color-ink-900)] md:text-sm">
          {title}
        </div>
        {subtitle ? (
          <div className="text-[11.5px] text-[var(--color-ink-500)] md:text-xs">
            {subtitle}
          </div>
        ) : null}
      </div>
      {badge}
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actions}</div>
      ) : null}
    </header>
  );
}
