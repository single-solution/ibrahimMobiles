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
    <div className={classNames("flex flex-col gap-1 md:gap-1.5", containerClassName)}>
      <label
        htmlFor={inputId}
        className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)] md:text-[11px] md:tracking-[0.14em]"
      >
        {label}
      </label>
      <div
        className={classNames(
          // 36px wrapper on phones (native-app input height) → 40px on tablets/desktop.
          "flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-2.5 transition-colors focus-within:border-[var(--color-accent-700)] focus-within:ring-2 focus-within:ring-[var(--color-accent-100)] md:h-10 md:px-3",
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
            // Global `input { font-size: 16px }` mobile rule (admin globals.css)
            // overrides text-sm under 640px to stop iOS Safari from zooming on
            // focus — visual size on phones is 16px, on desktop 14px (text-sm).
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
            "text-[10.5px] md:text-[11px]",
            errorText ? "text-rose-600" : "text-[var(--color-ink-500)]",
          )}
        >
          {errorText ?? hint}
        </p>
      )}
    </div>
  );
}
