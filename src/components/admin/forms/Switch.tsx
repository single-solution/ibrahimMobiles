"use client";

import { useState } from "react";
import { classNames } from "@/lib/utils";

interface SwitchProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  name?: string;
}

export function Switch({ label, description, defaultChecked = false, name }: SwitchProps) {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--color-ink-900)]">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{description}</p>
        )}
      </div>
      <input
        type="checkbox"
        name={name}
        checked={isChecked}
        onChange={(event) => setIsChecked(event.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={classNames(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          isChecked ? "bg-[var(--color-accent-700)]" : "bg-[var(--color-ink-200)]",
        )}
      >
        <span
          className={classNames(
            "absolute size-4 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform",
            isChecked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </label>
  );
}
