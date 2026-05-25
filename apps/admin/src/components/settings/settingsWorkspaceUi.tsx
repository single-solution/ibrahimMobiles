"use client";

import type { ReactNode } from "react";
import { classNames } from "@store/shared";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

export type SettingsTabId =
  | "store"
  | "contact"
  | "payments"
  | "delivery"
  | "social"
  | "policies"
  | "loyalty"
  | "homepage"
  | "seo"
  | "chat"
  | "cleanup";

export interface SettingsTabMeta {
  id: SettingsTabId;
  label: string;
  description: string;
}

export interface SettingsNavGroup {
  id: string;
  label: string;
  tabs: SettingsTabMeta[];
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "general",
    label: "General",
    tabs: [
      {
        id: "store",
        label: "Store details",
        description: "Site name and tagline shown across the storefront, browser titles, and chat.",
      },
      {
        id: "contact",
        label: "Contact",
        description: "Support phone, email, WhatsApp, and the physical outlet address on the site.",
      },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    tabs: [
      {
        id: "payments",
        label: "Payments",
        description: "Checkout discounts such as bank-transfer savings.",
      },
      {
        id: "delivery",
        label: "Delivery",
        description: "Free-delivery threshold applied at checkout.",
      },
      {
        id: "loyalty",
        label: "Loyalty",
        description: "Earn rate and bonus points shown on account and checkout.",
      },
      {
        id: "policies",
        label: "Policies",
        description: "Money-back window and default warranty surfaced on product pages.",
      },
    ],
  },
  {
    id: "storefront",
    label: "Storefront",
    tabs: [
      {
        id: "homepage",
        label: "Homepage hero",
        description:
          "Pick which categories and grades feed the rotating hero gallery, and how many phones it cycles through.",
      },
      {
        id: "social",
        label: "Social links",
        description: "Footer and about-page profile URLs.",
      },
      {
        id: "seo",
        label: "SEO",
        description: "Global meta defaults, Open Graph image, and organization structured data.",
      },
      {
        id: "chat",
        label: "Chat widget",
        description: "Floating support chat, welcome messages, and automated replies.",
      },
    ],
  },
  {
    id: "advanced",
    label: "Advanced",
    tabs: [
      {
        id: "cleanup",
        label: "Data cleanup",
        description: "Bulk-delete test or legacy records. Store settings are never removed.",
      },
    ],
  },
];

const TAB_META = new Map(
  SETTINGS_NAV_GROUPS.flatMap((group) => group.tabs.map((tab) => [tab.id, tab] as const)),
);

export function getSettingsTabMeta(id: SettingsTabId): SettingsTabMeta {
  return TAB_META.get(id) ?? { id, label: id, description: "" };
}

export function isSettingsTabId(value: string | null): value is SettingsTabId {
  return value !== null && TAB_META.has(value as SettingsTabId);
}

export function SettingsNavItem({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={classNames(
          "flex w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left text-xs transition-colors",
          isActive
            ? "bg-[var(--color-accent-100)] font-semibold text-[var(--color-accent-900)]"
            : "text-[var(--color-ink-700)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink-900)]",
        )}
      >
        <span className="truncate">{label}</span>
      </button>
    </li>
  );
}

export function SettingsMobileTabChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        isActive
          ? "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
          : "border border-[var(--color-ink-200)] bg-[var(--color-surface)] text-[var(--color-ink-600)]",
      )}
    >
      {label}
    </button>
  );
}

/**
 * Tab heading rendered above each tab's form card.
 *
 * Lives INSIDE the scrollable content area (not as a sticky chrome bar) so
 * the title and description scroll with the form. Sized prominently so the
 * active tab feels like a page within Settings rather than a tooltip.
 */
export function SettingsPanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="px-4 pt-4 md:px-5 md:pt-5">
      <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-ink-900)] md:text-base">
        {title}
      </h2>
      <p className="mt-1 max-w-prose text-[11.5px] leading-relaxed text-[var(--color-ink-500)] md:text-xs">
        {description}
      </p>
    </header>
  );
}

/**
 * Scrollable form body with optional sticky save footer inside the panel.
 *
 * Always stretches to the full width of the settings tab area so dense
 * surfaces like the chat assistant test panel and SEO previews can use
 * every available pixel. The form card itself caps individual fields with
 * `max-w-prose` to keep short inputs from spanning huge monitors.
 */
export function SettingsFormPanel({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full p-4 md:p-5">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        <div className="px-4 md:px-6">{children}</div>
        {footer}
      </div>
    </div>
  );
}

export function SettingsSaveFooter({
  onSave,
  onDiscard,
  saveLabel = "Save changes",
  discardLabel = "Discard",
  hint,
  showDiscard,
}: {
  onSave: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  hint?: string;
  showDiscard?: boolean;
}) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)]/90 px-3 py-2 backdrop-blur md:gap-3 md:px-6 md:py-3">
      <p className="text-[10.5px] text-[var(--color-ink-500)] md:text-[11px]">
        {hint ?? "Unsaved changes will be lost if you leave this tab."}
      </p>
      <div className="flex items-center gap-2">
        {showDiscard && onDiscard ? (
          <Button variant="ghost" size="sm" onClick={onDiscard} type="button">
            {discardLabel}
          </Button>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          onClick={onSave}
          type="button"
          disabled={saveLabel === "Saved"}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

export function SettingsLoadingPanel() {
  return (
    <SettingsFormPanel>
      <div className="space-y-6 py-6">
        <div className="space-y-2">
          <Skeleton shape="text" className="h-4 w-32" />
          <Skeleton shape="text" className="h-3 w-full max-w-md" />
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} shape="text" className="h-10 w-full" />
        ))}
      </div>
    </SettingsFormPanel>
  );
}
