"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Copy,
  CreditCard,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { StatusPill } from "@/components/admin/StatusPill";
import {
  type ActivityAction,
  type ActivityEntry,
  getActivityActionLabel,
} from "@/data/admin/activity";

const ACTION_ICONS: Record<ActivityAction, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  archived: Archive,
  duplicated: Copy,
  restocked: RefreshCcw,
  discounted: CreditCard,
  "logged-in": CheckCircle2,
};

const ACTION_TONE: Record<ActivityAction, "neutral" | "info" | "success" | "warn" | "danger" | "accent" | "dark"> = {
  created: "success",
  updated: "info",
  deleted: "danger",
  archived: "warn",
  duplicated: "neutral",
  restocked: "accent",
  discounted: "accent",
  "logged-in": "neutral",
};

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const [actionFilter, setActionFilter] = useState<"all" | ActivityAction>("all");

  const counts = useMemo(() => {
    const map = new Map<"all" | ActivityAction, number>();
    map.set("all", entries.length);
    for (const entry of entries) {
      map.set(entry.action, (map.get(entry.action) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const filtered = actionFilter === "all"
    ? entries
    : entries.filter((entry) => entry.action === actionFilter);

  const filterOptions: Array<"all" | ActivityAction> = [
    "all",
    "created",
    "updated",
    "deleted",
    "archived",
    "duplicated",
    "restocked",
    "discounted",
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {filterOptions.map((option) => {
          const isActive = actionFilter === option;
          const label = option === "all" ? "All" : getActivityActionLabel(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => setActionFilter(option)}
              className={
                isActive
                  ? "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-accent-700)] px-3.5 py-1.5 text-xs font-semibold capitalize text-white"
                  : "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] px-3.5 py-1.5 text-xs font-medium capitalize text-[var(--color-ink-700)] transition-colors hover:border-[var(--color-ink-400)]"
              }
            >
              {label}
              <span
                className={
                  isActive
                    ? "rounded-full bg-white/15 px-1.5 text-[10px] font-semibold"
                    : "rounded-full bg-[var(--color-canvas-deep)] px-1.5 text-[10px] font-semibold text-[var(--color-ink-500)]"
                }
              >
                {counts.get(option) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <ol className="relative space-y-4 border-l border-[var(--color-ink-100)] pl-6">
        {filtered.map((entry) => {
          const Icon = ACTION_ICONS[entry.action];
          return (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[34px] top-4 grid size-6 place-items-center rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] text-[var(--color-ink-700)]">
                <Icon size={11} />
              </span>
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[10px] font-semibold text-[var(--color-ink-700)]">
                      {entry.actorName
                        .split(" ")
                        .map((part) => part.charAt(0))
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                      {entry.actorName}{" "}
                      <span className="font-normal text-[var(--color-ink-500)]">
                        ({entry.actorRole})
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill tone={ACTION_TONE[entry.action]}>
                      {getActivityActionLabel(entry.action)}
                    </StatusPill>
                    <span className="text-[11px] text-[var(--color-ink-400)]">
                      {new Date(entry.occurredAt).toLocaleString("en-PK", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--color-ink-800)]">
                  <span className="text-[var(--color-ink-500)]">{entry.resourceType}:</span>{" "}
                  <span className="font-semibold text-[var(--color-ink-900)]">
                    {entry.resourceLabel}
                  </span>
                </p>
                {entry.detail && (
                  <p className="mt-1 text-xs text-[var(--color-ink-500)]">{entry.detail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
