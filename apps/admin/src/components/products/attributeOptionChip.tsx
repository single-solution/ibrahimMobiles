"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { classNames, coloredPillStyle } from "@store/shared";

/** Shared pill chrome — matches storefront PDP configurator attribute chips. */
export const ATTRIBUTE_OPTION_CHIP_BASE =
  "inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 py-0.5 text-[11px] font-medium leading-tight transition-all md:px-2.5 md:py-1 md:text-[11.5px]";

export function resolveOptionChipColor(
  optionColor?: string,
  attributeColor?: string,
): string | undefined {
  const color = optionColor?.trim() || attributeColor?.trim();
  return color && color.length > 0 ? color : undefined;
}

interface AttributeOptionChipButtonProps {
  label: ReactNode;
  backgroundColor?: string;
  isSelected: boolean;
  onClick: () => void;
  /** Dashed “Custom…” chip — no swatch. */
  variant?: "option" | "custom";
}

/**
 * Selectable attribute option pill for variant forms.
 * Same rules as storefront PDP: color is only a dot when unselected;
 * selected always uses default surface + accent border (never a filled color pill).
 */
export function AttributeOptionChipButton({
  label,
  backgroundColor,
  isSelected,
  onClick,
  variant = "option",
}: AttributeOptionChipButtonProps) {
  const hasSwatch = Boolean(backgroundColor);

  if (variant === "custom") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={classNames(
          ATTRIBUTE_OPTION_CHIP_BASE,
          isSelected
            ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
            : "border-dashed border-[var(--color-ink-300)] text-[var(--color-ink-600)] hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]",
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={classNames(
        ATTRIBUTE_OPTION_CHIP_BASE,
        isSelected
          ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] font-semibold text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
          : "border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-800)] hover:border-[var(--color-accent-500)] hover:bg-[var(--color-accent-50)] hover:text-[var(--color-accent-800)]",
      )}
    >
      {hasSwatch && !isSelected ? (
        <span
          aria-hidden
          className="inline-block size-2 shrink-0 rounded-full ring-1 ring-black/10"
          style={coloredPillStyle(backgroundColor!)}
        />
      ) : null}
      {isSelected ? <Check size={10} strokeWidth={3} aria-hidden /> : null}
      {label}
    </button>
  );
}
