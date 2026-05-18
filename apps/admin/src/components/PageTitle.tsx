import type { ReactNode } from "react";

interface PageTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageTitle({ eyebrow, title, description, actions }: PageTitleProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--color-ink-900)]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-snug text-[var(--color-ink-600)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
