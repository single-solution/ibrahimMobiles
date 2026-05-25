import type { TextareaHTMLAttributes } from "react";
import { classNames } from "@store/shared";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextArea({ label, hint, id, className, rows = 4, ...rest }: TextAreaProps) {
  const fieldId = id ?? `area-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1 md:gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)] md:text-[11px] md:tracking-[0.14em]"
      >
        {label}
      </label>
      <textarea
        id={fieldId}
        rows={rows}
        {...rest}
        className={classNames(
          "rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 py-2 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-100)] md:px-3 md:py-2.5",
          className,
        )}
      />
      {hint && (
        <p className="text-[10.5px] text-[var(--color-ink-500)] md:text-[11px]">{hint}</p>
      )}
    </div>
  );
}
