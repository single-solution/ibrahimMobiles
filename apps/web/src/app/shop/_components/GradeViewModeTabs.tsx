"use client";

import { classNames } from "@store/shared";

import { Skeleton } from "@/components/ui/Skeleton";
import {
  FILTER_PARAM_KEYS,
  isExpandGradesView,
} from "@/lib/storefront/filterParams";
import { useFilterParams } from "@/lib/storefront/useFilterParams";

/**
 * Two-tab segmented control for the listing view mode.
 *
 *   [ By product | By grade ]
 *
 * Drives the same `expandGrades` URL param the legacy "Browse by grade"
 * pill toggle in `SortDropdown` used to drive — now the mode lives in
 * exactly one place above the grid, so users can see at a glance which
 * view they're in. Works on mobile and desktop.
 */
export function GradeViewModeTabs({ className }: { className?: string }) {
  const { setSingle, params } = useFilterParams();
  const expandGrades = isExpandGradesView(params);

  function setMode(mode: "product" | "grade") {
    if (mode === "product" && expandGrades) {
      setSingle(FILTER_PARAM_KEYS.expandGrades, "");
    } else if (mode === "grade" && !expandGrades) {
      setSingle(FILTER_PARAM_KEYS.expandGrades, "1");
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Listing view mode"
      className={classNames(
        "inline-flex w-full items-center gap-1 rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-1 text-[13px] font-semibold sm:w-auto",
        className,
      )}
    >
      <Tab
        label="By product"
        sub="One card per device"
        isActive={!expandGrades}
        onClick={() => setMode("product")}
      />
      <Tab
        label="By grade"
        sub="One card per condition"
        isActive={expandGrades}
        onClick={() => setMode("grade")}
      />
    </div>
  );
}

interface TabProps {
  label: string;
  sub: string;
  isActive: boolean;
  onClick: () => void;
}

function Tab({ label, sub, isActive, onClick }: TabProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={classNames(
        "flex flex-1 flex-col items-center gap-0 rounded-full px-3 py-1.5 transition-colors sm:flex-none sm:px-4 sm:py-2",
        isActive
          ? "bg-[var(--color-surface)] text-[var(--color-accent-800)] shadow-[var(--shadow-sm)]"
          : "text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]",
      )}
    >
      <span className="leading-tight">{label}</span>
      <span
        className={classNames(
          "hidden text-[10.5px] font-medium leading-tight sm:block",
          isActive ? "text-[var(--color-accent-700)]" : "text-[var(--color-ink-500)]",
        )}
      >
        {sub}
      </span>
    </button>
  );
}

export function GradeViewModeTabsSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={classNames(
        "inline-flex w-full items-center gap-1 rounded-full border border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] p-1 sm:w-auto",
        className,
      )}
    >
      <Skeleton shape="pill" className="h-7 flex-1 sm:h-8 sm:w-32" />
      <Skeleton shape="pill" className="h-7 flex-1 sm:h-8 sm:w-32" />
    </div>
  );
}
