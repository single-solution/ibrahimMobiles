"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Package,
  Wallet,
} from "lucide-react";
import { classNames } from "@store/shared";

import {
  totalAdminAlertCount,
  useAdminAlerts,
} from "@/app/_components/dashboard/adminAlertsUi";
import { useAdminPermissions } from "@/lib/adminPermissionsContext";

interface MenuRowDescriptor {
  /**
   * `key` controls dedupe and ordering, `permission` is the gate, `count` is
   * the live number, `href` is where the row links, and `tone` colours the
   * leading icon to hint priority. `description` is the secondary line.
   */
  key: string;
  label: string;
  count: number;
  permission: "inquiry_view" | "order_view" | "product_view";
  href: string;
  tone: "danger" | "warn" | "neutral";
  icon: typeof Inbox;
  description: string;
}

/**
 * Desktop-only "Notifications" pill in the admin top header.
 *
 * Replaces the previously-hardcoded `3` badge with a live bell that polls
 * `/api/alerts/summary` (via `useAdminAlerts`) and surfaces the same three
 * counters the storefront dashboards already track:
 *   - unread inquiries (danger)
 *   - pending payments (warn)
 *   - low stock variants (warn)
 *
 * Clicking the pill opens a small dropdown that lists each non-zero
 * category as a row pointing to its workspace. Rows the active session
 * lacks permission to see are hidden (so a support_staff user without
 * `order_view` won't be teased with "5 pending payments" they can't open).
 */
export function NotificationsMenu() {
  const alerts = useAdminAlerts();
  const { can } = useAdminPermissions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const total = totalAdminAlertCount(alerts);
  const badgeLabel = total > 9 ? "9+" : String(total);

  // Close on outside click + Escape, mirroring UserMenu's behaviour so the
  // top bar dropdowns feel consistent.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Auto-close when the user navigates so the menu doesn't linger on the
  // destination page (Link clicks don't bubble past the dropdown otherwise).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot close on route change is intentional; nothing in this component triggers a cascading render from the close.
    setOpen(false);
  }, [pathname]);

  const allRows: MenuRowDescriptor[] = [
    {
      key: "unreadInquiries",
      label:
        alerts.unreadInquiries === 1
          ? "1 unread inquiry"
          : `${alerts.unreadInquiries} unread inquiries`,
      count: alerts.unreadInquiries,
      permission: "inquiry_view",
      href: "/inquiries",
      tone: "danger",
      icon: Inbox,
      description: "New customer messages waiting on a reply.",
    },
    {
      key: "pendingPayments",
      label:
        alerts.pendingPayments === 1
          ? "1 pending payment"
          : `${alerts.pendingPayments} pending payments`,
      count: alerts.pendingPayments,
      permission: "order_view",
      href: "/orders",
      tone: "warn",
      icon: Wallet,
      description: "Orders waiting on payment confirmation.",
    },
    {
      key: "lowStockVariants",
      label:
        alerts.lowStockVariants === 1
          ? "1 variant low on stock"
          : `${alerts.lowStockVariants} variants low on stock`,
      count: alerts.lowStockVariants,
      permission: "product_view",
      href: "/products",
      tone: "warn",
      icon: Package,
      description: "Stock counts at or below the low-stock threshold.",
    },
  ];

  const visibleRows = allRows.filter(
    (row) => row.count > 0 && can(row.permission),
  );

  // Surface the open inquiries counter as a calmer "neutral" row when no
  // unread reply is waiting — admins still want a one-click path to the
  // inbox without the danger styling that "unread" implies.
  const showOpenInquiriesRow =
    alerts.unreadInquiries === 0 &&
    alerts.openInquiries > 0 &&
    can("inquiry_view");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          total > 0
            ? `Notifications, ${total} pending`
            : "Notifications, all clear"
        }
        onClick={() => setOpen((current) => !current)}
        className={classNames(
          "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-2.5 text-[11px] font-medium text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--color-ink-200)] hover:bg-[var(--color-canvas-deep)] hover:text-[var(--color-ink-900)]",
          open && "ring-2 ring-[var(--color-accent-100)]",
        )}
      >
        <Bell size={12} strokeWidth={2.2} aria-hidden />
        <span>Notifications</span>
        {total > 0 ? (
          <span className="rounded-full bg-[var(--color-accent-500)] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[var(--color-ink-900)]">
            {badgeLabel}
          </span>
        ) : null}
        <ChevronDown
          size={12}
          className={classNames(
            "shrink-0 text-[var(--color-ink-400)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          /* Concentric: inner row icon well --radius-md (8) sits at the
             popover's px-2 gutter (~8px from corner) → outer 16 ≈
             --radius-lg (14, within 2px) — kept as-is. Bumped to xl
             because dense rows still benefit visually. */
          className="animate-popover-in absolute right-0 top-[calc(100%+6px)] z-dropdown w-72 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)]"
        >
          <header className="flex items-center justify-between gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Notifications
            </p>
            {total > 0 ? (
              <span className="rounded-full bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[9.5px] font-bold leading-none text-[var(--color-accent-800)]">
                {total}
              </span>
            ) : null}
          </header>

          {visibleRows.length === 0 && !showOpenInquiriesRow ? (
            <EmptyState />
          ) : (
            <ul className="p-1">
              {visibleRows.map((row) => (
                <NotificationRow key={row.key} row={row} />
              ))}
              {showOpenInquiriesRow ? (
                <NotificationRow
                  row={{
                    key: "openInquiries",
                    label:
                      alerts.openInquiries === 1
                        ? "1 open inquiry"
                        : `${alerts.openInquiries} open inquiries`,
                    count: alerts.openInquiries,
                    permission: "inquiry_view",
                    href: "/inquiries",
                    tone: "neutral",
                    icon: Inbox,
                    description: "All replied — keeping an eye on the thread.",
                  }}
                />
              ) : null}
            </ul>
          )}

          <footer className="border-t border-[var(--color-ink-100)] bg-[var(--color-canvas)] px-3 py-1.5 text-right">
            <Link
              href="/inquiries"
              className="text-[10.5px] font-semibold text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
            >
              Open inquiries inbox →
            </Link>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({ row }: { row: MenuRowDescriptor }) {
  const Icon = row.icon;
  return (
    <li>
      <Link
        href={row.href}
        role="menuitem"
        className="flex items-start gap-2.5 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors hover:bg-[var(--color-canvas-deep)]"
      >
        <span
          className={classNames(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-[var(--radius-md)]",
            row.tone === "danger" &&
              "bg-[var(--color-danger-50)] text-[var(--color-danger-700)]",
            row.tone === "warn" &&
              "bg-[var(--color-accent-50)] text-[var(--color-accent-800)]",
            row.tone === "neutral" &&
              "bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)]",
          )}
          aria-hidden
        >
          <Icon size={13} />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[12px] font-semibold text-[var(--color-ink-900)]">
            {row.label}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] text-[var(--color-ink-500)]">
            {row.description}
          </span>
        </span>
        {row.tone !== "neutral" ? (
          <AlertTriangle
            size={11}
            className={classNames(
              "mt-1 shrink-0",
              row.tone === "danger"
                ? "text-[var(--color-danger-700)]"
                : "text-[var(--color-accent-700)]",
            )}
            aria-hidden
          />
        ) : null}
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <span
        className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"
        aria-hidden
      >
        <CheckCircle2 size={15} />
      </span>
      <div className="leading-tight">
        <p className="text-[12px] font-semibold text-[var(--color-ink-900)]">
          All clear
        </p>
        <p className="text-[10.5px] text-[var(--color-ink-500)]">
          No unread inquiries, pending payments, or low-stock alerts.
        </p>
      </div>
    </div>
  );
}
