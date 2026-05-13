"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { classNames } from "@/lib/utils";

export interface ColorChipOption {
  value: string;
  label: string;
  swatch: string;
}

interface ColorChipsProps {
  label: string;
  options: ColorChipOption[];
  defaultValue?: string;
  hint?: string;
}

export function ColorChips({ label, options, defaultValue, hint }: ColorChipsProps) {
  const [selected, setSelected] = useState(defaultValue ?? options[0]?.value);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-700)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelected(option.value)}
              className={classNames(
                "inline-flex items-center gap-2 rounded-[var(--radius-full)] border px-3 py-1.5 text-xs font-medium transition-colors",
                isSelected
                  ? "border-[var(--color-accent-700)] bg-[var(--color-accent-700)] text-white"
                  : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-700)] hover:border-[var(--color-ink-400)]",
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
