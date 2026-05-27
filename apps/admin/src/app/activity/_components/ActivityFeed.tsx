"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Archive,
  CheckCircle2,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { StatusPill } from "@/components/shared/StatusPill";
import {
  WorkspaceEmptyPane,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspaceListHeader,
} from "@/components/shared/adminWorkspaceUi";
import { formatActivityAction } from "@/lib/activityLabels";
import { getInitials } from "@/lib/initials";
import type { AdminActivityEntry } from "@/types/admin";

type Action = AdminActivityEntry["action"];

const ACTION_ICONS: Record<string, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  archived: Archive,
  restored: RefreshCcw,
  status_changed: CheckCircle2,
  login: LogIn,
  logout: LogOut,
  invited: Mail,
};

type Tone = "neutral" | "info" | "success" | "warn" | "danger" | "accent" | "dark";

const ACTION_TONE: Record<string, Tone> = {
  created: "success",
  updated: "info",
  deleted: "danger",
  archived: "warn",
  restored: "accent",
  status_changed: "info",
  login: "neutral",
  logout: "neutral",
  invited: "accent",
};

interface ActivityFeedProps {
  entries: AdminActivityEntry[];
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const [actionFilter, setActionFilter] = useState<"all" | Action>("all");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", entries.length);
    for (const entry of entries) {
      map.set(entry.action, (map.get(entry.action) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const filtered =
    actionFilter === "all"
      ? entries
      : entries.filter((entry) => entry.action === actionFilter);

  const filterOptions = useMemo(() => {
    const present = Array.from(new Set(entries.map((entry) => entry.action))).sort();
    return ["all", ...present] as Array<"all" | Action>;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <WorkspaceFrame>
        <WorkspaceListHeader
          icon={Activity}
          title="Activity log"
          subtitle="Every change made by admins, with timestamps and actors."
        />
        <WorkspaceEmptyPane
          icon={Activity}
          title="No activity yet"
          description="Admin actions will appear here as they happen."
        />
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame>
      <WorkspaceListHeader
        icon={Activity}
        title="Activity log"
        subtitle="Every change made by admins, with timestamps and actors."
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => {
            const label = option === "all" ? "All" : formatActivityAction(option);
            return (
              <WorkspaceFilterChip
                key={option}
                label={label}
                count={counts.get(option) ?? 0}
                isActive={actionFilter === option}
                onClick={() => setActionFilter(option)}
              />
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <WorkspaceEmptyPane
            icon={Activity}
            title="No matching activity"
            description="Try another filter or show all actions."
            action={
              <button
                type="button"
                onClick={() => setActionFilter("all")}
                className="text-xs font-semibold text-[var(--color-accent-700)] hover:underline"
              >
                Clear filters
              </button>
            }
          />
        ) : (
        <ol className="relative space-y-4 border-l border-[var(--color-ink-100)] pl-6">
          {filtered.map((entry) => {
            const Icon = ACTION_ICONS[entry.action] ?? Pencil;
            const tone = ACTION_TONE[entry.action] ?? "neutral";
            return (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[34px] top-4 grid size-6 place-items-center rounded-full border border-[var(--color-ink-100)] bg-[var(--color-surface)] text-[var(--color-ink-700)]">
                  <Icon size={11} />
                </span>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[10px] font-semibold text-[var(--color-ink-700)]">
                        {getInitials(entry.actorName)}
                      </span>
                      <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                        {entry.actorName}{" "}
                        <span className="font-normal text-[var(--color-ink-500)]">
                          ({entry.actorRole})
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={tone}>
                        {formatActivityAction(entry.action)}
                      </StatusPill>
                      <span className="text-[11px] text-[var(--color-ink-400)]">
                        {new Date(entry.createdAt).toLocaleString("en-PK", {
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
                  {entry.detail ? (
                    <p className="mt-1 text-xs text-[var(--color-ink-500)]">{entry.detail}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
        )}
      </div>
    </WorkspaceFrame>
  );
}
