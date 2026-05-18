"use client";

import { useState } from "react";
import { classNames } from "@store/shared";

interface SwitchProps {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  /** Controlled value. If provided, `defaultChecked` is ignored. */
  checked?: boolean;
  /** Fires whenever the toggle changes. Use with `checked`. */
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
}

export function Switch({
  label,
  description,
  defaultChecked = false,
  checked,
  onCheckedChange,
  name,
  disabled = false,
}: SwitchProps) {
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = isControlled ? checked : internalChecked;

  function handleChange(next: boolean) {
    if (!isControlled) {
      setInternalChecked(next);
    }
    onCheckedChange?.(next);
  }

  return (
    <label
      className={classNames(
        "flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
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
        disabled={disabled}
        onChange={(event) => handleChange(event.target.checked)}
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
