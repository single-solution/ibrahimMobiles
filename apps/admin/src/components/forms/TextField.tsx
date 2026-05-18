import type { InputHTMLAttributes, ReactNode } from "react";
import { classNames } from "@store/shared";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  errorText?: string;
  leadingIcon?: ReactNode;
  trailingAddon?: ReactNode;
  containerClassName?: string;
}

export function TextField({
  label,
  hint,
  errorText,
  leadingIcon,
  trailingAddon,
  containerClassName,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={classNames("flex flex-col gap-1.5", containerClassName)}>
      <label
        htmlFor={inputId}
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]"
      >
        {label}
      </label>
      <div
        className={classNames(
          "flex h-10 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3 transition-colors focus-within:border-[var(--color-accent-700)] focus-within:ring-2 focus-within:ring-[var(--color-accent-100)]",
          errorText && "border-rose-300 focus-within:border-rose-400 focus-within:ring-rose-100",
        )}
      >
        {leadingIcon && (
          <span className="text-[var(--color-ink-400)]">{leadingIcon}</span>
        )}
        <input
          id={inputId}
          {...rest}
          className={classNames(
            "h-full w-full bg-transparent text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:outline-none",
            className,
          )}
        />
        {trailingAddon && (
          <span className="text-xs font-medium text-[var(--color-ink-500)]">{trailingAddon}</span>
        )}
      </div>
      {(hint || errorText) && (
        <p
          className={classNames(
            "text-[11px]",
            errorText ? "text-rose-600" : "text-[var(--color-ink-500)]",
          )}
        >
          {errorText ?? hint}
        </p>
      )}
    </div>
  );
}
