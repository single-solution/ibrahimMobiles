"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { classNames } from "@store/shared";

interface ColorChipOption {
  value: string;
  label: string;
  swatch: string;
}

interface ColorChipsProps {
  label: string;
  options: ColorChipOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  hint?: string;
}

export function ColorChips({
  label,
  options,
  defaultValue,
  value,
  onChange,
  hint,
}: ColorChipsProps) {
  const [internal, setInternal] = useState(defaultValue ?? options[0]?.value);
  const isControlled = value !== undefined;
  const selected = isControlled ? value : internal;

  function handleSelect(next: string) {
    if (!isControlled) {
      setInternal(next);
    }
    onChange?.(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-700)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={classNames(
                "inline-flex items-center gap-2 rounded-[var(--radius-full)] px-3 py-1.5 text-xs transition-colors",
                isSelected
                  ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-800)]"
                  : "border border-[var(--color-ink-100)] font-medium text-[var(--color-ink-700)] hover:border-[var(--color-ink-300)] hover:text-[var(--color-ink-900)]",
              )}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: option.swatch }}
              />
              {option.label}
              {isSelected && <Check size={12} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
      {hint && <p className="text-[11px] text-[var(--color-ink-500)]">{hint}</p>}
    </div>
  );
}
