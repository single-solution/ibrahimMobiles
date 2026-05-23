"use client";

import { useState, type ReactNode } from "react";
import { classNames } from "@store/shared";

export interface TabListItem {
  id: string;
  label: string;
  count?: number;
}

interface TabItem extends TabListItem {
  content: ReactNode;
}

interface TabListProps {
  tabs: TabListItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Tighter padding for drawers and toolbars. */
  compact?: boolean;
  /**
   * When tab count is at or below `stretchThreshold`, tabs grow to fill the row.
   * Above the threshold, tabs stay content-width and wrap.
   */
  fillWhenFew?: boolean;
  stretchThreshold?: number;
  "aria-label"?: string;
  className?: string;
}

export function TabList({
  tabs,
  activeId,
  onChange,
  compact = false,
  fillWhenFew = true,
  stretchThreshold = 5,
  "aria-label": ariaLabel,
  className,
}: TabListProps) {
  const stretchTabs =
    fillWhenFew && tabs.length > 0 && tabs.length <= stretchThreshold;

  return (
    <div
      className={classNames(
        "border-b border-[var(--color-ink-100)]",
        stretchTabs ? "flex w-full" : "flex flex-wrap gap-1",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={classNames(
              "relative flex items-center gap-2 font-medium transition-colors",
              compact ? "px-4 py-2.5 text-xs" : "px-5 py-3 text-sm",
              stretchTabs
                ? "min-w-0 flex-1 justify-center"
                : "shrink-0",
              isActive
                ? "text-[var(--color-accent-700)]"
                : "text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]",
            )}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={classNames(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive
                    ? "bg-[var(--color-accent-700)] text-white"
                    : "bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)]",
                )}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-[var(--color-accent-700)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabsProps {
  tabs: TabItem[];
  initialTabId?: string;
}

export function Tabs({ tabs, initialTabId }: TabsProps) {
  const [activeId, setActiveId] = useState(initialTabId ?? tabs[0]?.id);
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  return (
    <div>
      <TabList tabs={tabs} activeId={activeTab?.id ?? ""} onChange={setActiveId} />
      <div className="pt-7">{activeTab?.content}</div>
    </div>
  );
}
