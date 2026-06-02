import { forwardRef } from "react";
import { classNames } from "@store/shared";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  icon?: React.ReactNode;
  error?: string | null;
  isMonospace?: boolean;
  inputSize?: "sm" | "md" | "lg";
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  variant?: "default" | "search";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, icon, error, isMonospace, inputSize = "md", rounded = "md", variant = "default", className, ...props },
  ref,
) {
  return (
    <label className={classNames("block w-full", className)}>
      {label && (
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          {label}
          {props.required && <span className="ml-0.5 text-[var(--color-error-500)]">*</span>}
        </span>
      )}
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-400)]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          {...props}
          className={classNames(
            "w-full border transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-[var(--color-canvas-deep)] disabled:text-[var(--color-ink-500)]",
            inputSize === "sm" && "h-9 text-[13px]",
            inputSize === "md" && "h-11 text-sm",
            inputSize === "lg" && "h-12 text-[15px]",
            rounded === "sm" && "rounded-[var(--radius-sm)]",
            rounded === "md" && "rounded-[var(--radius-md)]",
            rounded === "lg" && "rounded-[var(--radius-lg)]",
            rounded === "xl" && "rounded-[var(--radius-xl)]",
            rounded === "2xl" && "rounded-[var(--radius-2xl)]",
            rounded === "full" && "rounded-[var(--radius-full)]",
            variant === "search"
              ? "border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:border-[var(--color-accent-500)] focus:bg-[var(--color-canvas)] focus:ring-[var(--color-accent-500)]/30"
              : error
                ? "border-[var(--color-danger-300)] bg-[var(--color-canvas)] focus:border-[var(--color-danger-500)] focus:ring-[var(--color-danger-500)]/30 text-[var(--color-danger-900)] placeholder:text-[var(--color-danger-400)]"
                : "border-[var(--color-ink-100)] bg-[var(--color-canvas)] focus:border-[var(--color-accent-500)] focus:ring-[var(--color-accent-500)]/30 text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)]",
            icon ? "pl-9 pr-3" : "px-3.5",
            variant === "search" && icon ? "pl-9 pr-10" : "", // specific for search clear button space
            isMonospace && "font-mono tracking-[0.4em]",
            props.readOnly && !props.disabled ? "cursor-not-allowed opacity-70" : "",
          )}
        />
      </span>
      {error && (
        <span
          role="alert"
          className="mt-1.5 block text-[12.5px] font-medium text-[var(--color-danger-700)]"
        >
          {error}
        </span>
      )}
    </label>
  );
});
