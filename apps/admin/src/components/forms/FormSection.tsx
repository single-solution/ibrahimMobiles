import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="grid gap-3 border-b border-[var(--color-ink-100)] py-4 first:pt-0 last:border-b-0 md:gap-5 md:py-6 lg:grid-cols-[220px_minmax(0,360px)] lg:gap-10">
      <header>
        <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)] md:text-sm">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-ink-500)] md:mt-1.5 md:text-xs">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-3 md:space-y-4">{children}</div>
    </section>
  );
}
