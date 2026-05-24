"use client";

import { useMemo, useState } from "react";
import { classNames } from "@store/shared";
import { GradeBadge } from "@/components/shared/GradeBadge";
import {
  StructuredContentFull,
} from "@/components/shared/StructuredContent";
import type { GradeCategoryGroup } from "@/lib/storefront/gradeGroups";

interface GradesByCategoryTabsProps {
  groups: GradeCategoryGroup[];
  variant: "mobile" | "desktop";
}

export function GradesByCategoryTabs({ groups, variant }: GradesByCategoryTabsProps) {
  const [activeCategorySlug, setActiveCategorySlug] = useState(
    () => groups[0]?.categorySlug ?? "",
  );

  const activeGroup = useMemo(
    () => groups.find((group) => group.categorySlug === activeCategorySlug) ?? groups[0],
    [groups, activeCategorySlug],
  );

  if (groups.length === 0 || !activeGroup) {
    return null;
  }

  const showTabs = groups.length > 1;

  return (
    <div className={variant === "desktop" ? "space-y-4" : "mt-8 space-y-4"}>
      {showTabs && (
        <div
          className={classNames(
            "flex w-full divide-x divide-white/15 overflow-x-auto rounded-[var(--radius-md)] border border-white/15",
            variant === "mobile" && "scrollbar-none",
          )}
          role="tablist"
          aria-label="Grade categories"
        >
          {groups.map((group) => {
            const isSelected = group.categorySlug === activeGroup.categorySlug;
            return (
              <button
                key={group.categorySlug}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={`grades-panel-${group.categorySlug}`}
                onClick={() => setActiveCategorySlug(group.categorySlug)}
                className={classNames(
                  "tap min-w-0 flex-1 whitespace-nowrap px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors md:px-4 md:py-3 md:text-xs",
                  isSelected
                    ? "bg-white/10 text-[var(--color-accent-300)]"
                    : "bg-white/[0.03] text-[var(--color-ink-300)] hover:bg-white/[0.06] hover:text-[var(--color-canvas)]",
                )}
              >
                {group.categoryLabel}
              </button>
            );
          })}
        </div>
      )}

      <GradeCardGrid
        grades={activeGroup.grades}
        variant={variant}
        panelId={activeGroup.categorySlug}
      />
    </div>
  );
}

function GradeCardGrid({
  grades,
  variant,
  panelId,
}: {
  grades: GradeCategoryGroup["grades"];
  variant: "mobile" | "desktop";
  panelId: string;
}) {
  if (variant === "mobile") {
    return (
      <ul
        role="tabpanel"
        id={`grades-panel-${panelId}`}
        className="reveal-stagger grid grid-cols-2 gap-2.5"
      >
        {grades.map((descriptor) => (
          <li
            key={`${descriptor.categorySlug}:${descriptor.slug}`}
            className="reveal flex flex-col gap-2 rounded-[14px] border border-white/10 bg-white/[0.06] p-3"
          >
            <GradeBadge
              categorySlug={descriptor.categorySlug}
              gradeSlug={descriptor.slug}
              size="sm"
            />
            <GradeCardCopy descriptor={descriptor} variant={variant} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      role="tabpanel"
      id={`grades-panel-${panelId}`}
      className="reveal-stagger grid grid-cols-3 gap-3"
    >
      {grades.map((descriptor) => (
        <div
          key={`${descriptor.categorySlug}:${descriptor.slug}`}
          className="reveal flex flex-col gap-2.5 rounded-[var(--radius-lg)] border border-white/10 bg-white/5 p-5"
        >
          <GradeBadge
            categorySlug={descriptor.categorySlug}
            gradeSlug={descriptor.slug}
            size="sm"
          />
          <GradeCardCopy descriptor={descriptor} variant={variant} />
        </div>
      ))}
    </div>
  );
}

function GradeCardCopy({
  descriptor,
  variant,
}: {
  descriptor: GradeCategoryGroup["grades"][number];
  variant: "mobile" | "desktop";
}) {
  const textClass =
    variant === "mobile"
      ? "text-[12.5px] leading-snug text-[var(--color-canvas)] [&>p:first-child]:line-clamp-2"
      : "text-sm text-[var(--color-canvas)] [&>p:first-child]:line-clamp-3";

  return (
    <StructuredContentFull
      content={descriptor.content}
      fallback={descriptor.notes}
      maxBullets={variant === "desktop" ? 3 : 2}
      iconColor={descriptor.color}
      iconSize={variant === "desktop" ? 13 : 12}
      iconSizeClass={variant === "desktop" ? "size-[13px]" : "size-3"}
      className={textClass}
      bulletItemClassName={classNames(textClass, "items-start")}
    />
  );
}
