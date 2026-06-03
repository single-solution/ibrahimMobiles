"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { classNames } from "@store/shared";

import { Icon } from "@/components/shared/Icon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { CategoryMeta } from "@/lib/core/queries";

interface MobileCategoryPickerProps {
  activeSlug: string;
  categories: CategoryMeta[];
}

/**
 * Compact mobile category switcher.
 *
 * Replaces the horizontally-scrolling `ShopCategoryRail` of pills with a
 * single trigger pill that opens a bottom sheet listing every category.
 * Saves a full row of vertical space on mobile, fits cleanly next to
 * `[Filter]` and `[Sort]` in a single toolbar row, and uses the same
 * `BottomSheet` pattern the rest of the storefront already uses for
 * filters and the menu.
 */
export function MobileCategoryPicker({
  activeSlug,
  categories,
}: MobileCategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = categories.find((category) => category.slug === activeSlug);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-9 min-w-0 max-w-[12rem] flex-1 items-center gap-1.5 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-sm)] px-3 text-[13px] font-medium text-[var(--color-ink-900)] transition-colors active:bg-[var(--color-canvas-deep)]"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {active ? (
          <Icon
            node={active.iconNode}
            size={14}
            strokeWidth={2.2}
            className="shrink-0 text-[var(--color-accent-700)]"
          />
        ) : null}
        <span className="line-clamp-1 min-w-0 flex-1 text-left">
          {active?.label ?? "Category"}
        </span>
        <ChevronDown size={13} aria-hidden className="shrink-0 text-[var(--color-ink-500)]" />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Choose a category"
        description="Switch the shop to a different catalog."
        height="md"
      >
        <ul className="space-y-1.5">
          {categories.map((category) => {
            const isActive = category.slug === activeSlug;
            const isAvailable = category.isActive;
            const inner = (
              <span
                className={classNames(
                  "flex w-full items-center gap-3 rounded-[var(--radius-lg)] border px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border-[var(--color-accent-500)] bg-[var(--color-accent-50)] text-[var(--color-accent-900)]"
                    : isAvailable
                      ? "border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-900)] active:bg-[var(--color-surface-muted)]"
                      : "cursor-not-allowed border-dashed border-[var(--color-ink-200)] bg-[var(--color-canvas-deep)]/50 text-[var(--color-ink-500)]",
                )}
              >
                <span
                  className={classNames(
                    "grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)]",
                    isActive
                      ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                      : "bg-[var(--color-accent-50)] text-[var(--color-accent-700)]",
                  )}
                >
                  <Icon node={category.iconNode} size={16} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold leading-tight">
                    {category.label}
                  </span>
                  {!isAvailable ? (
                    <span className="mt-0.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-500)]">
                      Coming soon
                    </span>
                  ) : null}
                </span>
              </span>
            );

            return (
              <li key={category.slug}>
                {isAvailable ? (
                  <Link
                    href={`/shop/${category.slug}`}
                    scroll={false}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className="block focus:outline-none"
                  >
                    {inner}
                  </Link>
                ) : (
                  <span aria-disabled className="block">
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
