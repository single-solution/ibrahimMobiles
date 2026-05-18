import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { classNames } from "@store/shared";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
  hint?: string;
}

export function SelectField({ label, options, hint, id, className, ...rest }: SelectFieldProps) {
  const fieldId = id ?? `select-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={fieldId}
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]"
      >
        {label}
      </label>
      <div className="relative flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] transition-colors focus-within:border-[var(--color-accent-700)] focus-within:ring-2 focus-within:ring-[var(--color-accent-100)]">
        <select
          id={fieldId}
          {...rest}
          className={classNames(
            "h-full w-full appearance-none bg-transparent pl-3 pr-9 text-sm text-[var(--color-ink-900)] focus:outline-none",
            className,
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 text-[var(--color-ink-400)]"
        />
      </div>
      {hint && <p className="text-[11px] text-[var(--color-ink-500)]">{hint}</p>}
    </div>
  );
}
