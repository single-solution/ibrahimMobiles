import type { InputHTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leadingIcon?: ReactNode;
}

export function Input({
  label,
  helperText,
  errorText,
  leadingIcon,
  className,
  id,
  ...rest
}: InputProps) {
  const inputId = id ?? rest.name;
  const hasError = Boolean(errorText);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[var(--color-ink-700)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]">
            {leadingIcon}
          </span>
        )}
        <input
          id={inputId}
          {...rest}
          className={classNames(
            "h-11 w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3.5 text-sm",
            "text-[var(--color-ink-800)] placeholder:text-[var(--color-ink-400)]",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-500)] focus:border-transparent",
            leadingIcon && "pl-10",
            hasError
              ? "border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]"
              : "border-[var(--color-ink-200)] hover:border-[var(--color-ink-300)]",
            className,
          )}
        />
      </div>
      {(helperText || errorText) && (
        <p
          className={classNames(
            "text-xs",
            hasError ? "text-[var(--color-danger-500)]" : "text-[var(--color-ink-500)]",
          )}
        >
          {errorText ?? helperText}
        </p>
      )}
    </div>
  );
}
