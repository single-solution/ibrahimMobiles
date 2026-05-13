import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ink-200)] bg-[var(--color-surface)] px-6 py-12 text-center">
      {icon && (
        <span className="grid size-12 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[var(--color-ink-500)]">
          {icon}
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-ink-500)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
