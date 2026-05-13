import type { ReactNode } from "react";

interface PageTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageTitle({ eyebrow, title, description, actions }: PageTitleProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
      <div className="space-y-1.5 sm:space-y-2">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-500)] sm:text-[11px]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[22px] font-semibold leading-[1.1] tracking-[-0.025em] text-[var(--color-ink-900)] sm:text-[30px] lg:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-[13px] text-[var(--color-ink-600)] sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
