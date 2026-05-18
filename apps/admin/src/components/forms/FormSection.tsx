import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="grid gap-6 border-b border-[var(--color-ink-100)] py-8 first:pt-0 last:border-b-0 lg:grid-cols-[260px_1fr] lg:gap-10">
      <header>
        <h3 className="text-sm font-semibold tracking-tight text-[var(--color-ink-900)]">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-ink-500)]">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
