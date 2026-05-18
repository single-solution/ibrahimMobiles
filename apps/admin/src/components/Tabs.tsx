"use client";

import { useState, type ReactNode } from "react";
import { classNames } from "@store/shared";

interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: ReactNode;
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
      <div
        className="flex flex-wrap gap-1 border-b border-[var(--color-ink-100)]"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(tab.id)}
              className={classNames(
                "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors",
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
      <div className="pt-7">{activeTab?.content}</div>
    </div>
  );
}
