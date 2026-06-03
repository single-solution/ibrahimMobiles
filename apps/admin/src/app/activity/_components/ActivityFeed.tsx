"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  CheckCircle2,
  KeyRound,
  LogIn,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { classNames } from "@store/shared";
import { StatusPill, type StatusTone } from "@/components/shared/StatusPill";
import {
  WorkspaceCatalogPaneHeader,
  WorkspaceEmptyPane,
  WorkspaceFilterChip,
  WorkspaceFrame,
  WorkspaceSearchField,
} from "@/components/shared/workspaceUi";
import { formatActivityAction } from "@/lib/activityLabels";
import type { AdminActivityEntry, AdminActivityResourceType } from "@/types/models";

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
  signin_code_issued: KeyRound,
};

const ACTION_TONE: Record<string, StatusTone> = {
  created: "success",
  updated: "info",
  deleted: "danger",
  archived: "warn",
  restored: "accent",
  status_changed: "info",
  login: "neutral",
  logout: "neutral",
  invited: "accent",
  signin_code_issued: "warn",
};

const TONE_CIRCLE: Record<StatusTone, string> = {
  neutral: "bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)]",
  info: "bg-sky-50 text-sky-700",
  success: "bg-[var(--color-accent-50)] text-[var(--color-accent-700)]",
  warn: "bg-amber-50 text-amber-700",
  danger: "bg-rose-50 text-rose-700",
  accent: "bg-[var(--color-accent-50)] text-[var(--color-accent-800)]",
  dark: "bg-[var(--color-ink-900)] text-white",
};

const RESOURCE_LABELS: Record<AdminActivityResourceType, string> = {
  product: "Products",
  brand: "Brands",
  category: "Categories",
  grade: "Grades",
  attribute: "Attributes",
  order: "Orders",
  customer: "Customers",
  loyalty: "Loyalty",
  inquiry: "Inquiries",
  offer: "Offers",
  team: "Team",
  settings: "Settings",
  auth: "Auth",
};

function resourceLabel(type: AdminActivityResourceType): string {
  return RESOURCE_LABELS[type] ?? type;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ActivityFeedProps {
  entries: AdminActivityEntry[];
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const [resourceFilter, setResourceFilter] = useState<"all" | AdminActivityResourceType>("all");
  const [actionFilter, setActionFilter] = useState<"all" | Action>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const resourceOptions = useMemo(() => {
    const present = Array.from(new Set(entries.map((entry) => entry.resourceType)));
    present.sort((first, second) => resourceLabel(first).localeCompare(resourceLabel(second)));
    return present;
  }, [entries]);

  const actionOptions = useMemo(() => {
    const present = Array.from(new Set(entries.map((entry) => entry.action)));
    return present.sort();
  }, [entries]);

  const resourceCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      map.set(entry.resourceType, (map.get(entry.resourceType) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const actionCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      map.set(entry.action, (map.get(entry.action) ?? 0) + 1);
    }
    return map;
  }, [entries]);

  const filtered = useMemo(() => {
    const term = deferredQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      if (resourceFilter !== "all" && entry.resourceType !== resourceFilter) {
        return false;
      }
      if (actionFilter !== "all" && entry.action !== actionFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      return `${entry.actorName} ${entry.actorRole} ${entry.resourceType} ${entry.resourceLabel} ${entry.detail ?? ""} ${formatActivityAction(entry.action)}`
        .toLowerCase()
        .includes(term);
    });
  }, [entries, resourceFilter, actionFilter, deferredQuery]);

  if (entries.length === 0) {
    return (
      <WorkspaceFrame>
        <WorkspaceCatalogPaneHeader
          title={
            <div className="flex min-w-0 items-center gap-1.5">
              <Activity size={15} className="shrink-0 text-[var(--color-accent-700)]" />
              <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Activity log</h2>
            </div>
          }
          subtitle="Every change made by admins, with timestamps and actors."
        />
        <WorkspaceEmptyPane
          iconElement={<Activity size={22} />}
          title="No activity yet"
          description="Admin actions will appear here as they happen."
        />
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame>
      <WorkspaceCatalogPaneHeader
        title={
          <div className="flex min-w-0 items-center gap-1.5">
            <Activity size={15} className="shrink-0 text-[var(--color-accent-700)]" />
            <h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Activity log</h2>
          </div>
        }
        subtitle={`${filtered.length} shown · ${entries.length} total`}
        search={
          <WorkspaceSearchField
            value={query}
            onChange={setQuery}
            placeholder="Search actor, item, detail…"
            aria-label="Search activity"
            className="min-w-0 flex-1 sm:max-w-[16rem] sm:flex-none"
          />
        }
        filters={
          <>
            <div className="flex w-full flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
                Type
              </span>
              <WorkspaceFilterChip
                label="All"
                count={entries.length}
                isActive={resourceFilter === "all"}
                onClick={() => setResourceFilter("all")}
              />
              {resourceOptions.map((type) => (
                <WorkspaceFilterChip
                  key={type}
                  label={resourceLabel(type)}
                  count={resourceCounts.get(type) ?? 0}
                  isActive={resourceFilter === type}
                  onClick={() => setResourceFilter(type)}
                />
              ))}
            </div>
            <div className="flex w-full flex-wrap items-center gap-1.5">
              <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-400)]">
                Action
              </span>
              <WorkspaceFilterChip
                label="All"
                isActive={actionFilter === "all"}
                onClick={() => setActionFilter("all")}
                compact
              />
              {actionOptions.map((action) => (
                <WorkspaceFilterChip
                  key={action}
                  label={formatActivityAction(action)}
                  count={actionCounts.get(action) ?? 0}
                  isActive={actionFilter === action}
                  onClick={() => setActionFilter(action)}
                  compact
                />
              ))}
            </div>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5 md:p-3">
        {filtered.length === 0 ? (
          <WorkspaceEmptyPane
            iconElement={<Activity size={22} />}
            title="No matching activity"
            description="Try another filter or clear the search."
            action={
              <button
                type="button"
                onClick={() => {
                  setResourceFilter("all");
                  setActionFilter("all");
                  setQuery("");
                }}
                className="text-xs font-semibold text-[var(--color-accent-700)] hover:underline"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--color-ink-100)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
            {filtered.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] ?? Pencil;
              const tone = ACTION_TONE[entry.action] ?? "neutral";
              return (
                <li
                  key={entry.id}
                  className="flex items-start gap-2.5 px-3 py-2 transition-colors hover:bg-[var(--color-canvas-deep)]/40"
                >
                  <span
                    className={classNames(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                      TONE_CIRCLE[tone],
                    )}
                  >
                    <Icon size={11} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 truncate text-[12.5px] text-[var(--color-ink-900)]">
                        <span className="font-semibold">{entry.actorName}</span>
                        <span className="text-[var(--color-ink-400)]"> · {entry.actorRole}</span>
                      </p>
                      <time
                        dateTime={entry.createdAt}
                        className="shrink-0 whitespace-nowrap text-[10.5px] tabular-nums text-[var(--color-ink-400)]"
                      >
                        {formatTimestamp(entry.createdAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-[var(--color-ink-700)]">
                      <StatusPill tone={tone} className="mr-1.5 align-middle">
                        {formatActivityAction(entry.action)}
                      </StatusPill>
                      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-400)]">
                        {resourceLabel(entry.resourceType)}
                      </span>
                      <span className="font-medium text-[var(--color-ink-900)]">
                        {entry.resourceLabel}
                      </span>
                      {entry.detail ? (
                        <span className="text-[var(--color-ink-500)]"> — {entry.detail}</span>
                      ) : null}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </WorkspaceFrame>
  );
}
