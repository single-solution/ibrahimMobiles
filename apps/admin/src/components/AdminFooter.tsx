"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { classNames } from "@store/shared";

import { adminFetch } from "@/lib/adminApi";
import { useStoreSettings } from "@/lib/storeSettingsContext";
import type { AlertSummary } from "@/lib/server/alertSummary";

const EMPTY_ALERTS: AlertSummary = {
  unreadInquiries: 0,
  pendingPayments: 0,
  lowStockVariants: 0,
  openInquiries: 0,
};

function FooterAlertPill({
  href,
  label,
  tone = "neutral",
}: {
  href: string;
  label: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  return (
    <Link
      href={href}
      className={classNames(
        "inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-full)] border px-2 py-0.5 text-[10px] font-semibold transition-colors",
        tone === "danger" &&
          "border-[var(--color-rose-200)] bg-[var(--color-rose-50)] text-[var(--color-rose-800)] hover:border-[var(--color-rose-300)]",
        tone === "warn" &&
          "border-[var(--color-accent-200)] bg-[var(--color-accent-50)] text-[var(--color-accent-900)] hover:border-[var(--color-accent-300)]",
        tone === "neutral" &&
          "border-[var(--color-ink-100)] bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)] hover:border-[var(--color-ink-200)] hover:text-[var(--color-ink-900)]",
      )}
    >
      {label}
    </Link>
  );
}

function AdminFooterAlerts() {
  const [alerts, setAlerts] = useState<AlertSummary>(EMPTY_ALERTS);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await adminFetch<AlertSummary>("/api/alerts/summary");
        if (!cancelled) setAlerts(data);
      } catch {
        // ignore — footer stays on last good values or empty
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const hasAlerts =
    alerts.unreadInquiries > 0 ||
    alerts.pendingPayments > 0 ||
    alerts.lowStockVariants > 0;

  if (!hasAlerts) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[var(--color-ink-500)]">
        <span className="grid size-1.5 place-items-center rounded-full bg-emerald-500" aria-hidden />
        All clear — no alerts right now
      </span>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
      {alerts.unreadInquiries > 0 ? (
        <FooterAlertPill
          href="/inquiries"
          tone="danger"
          label={`${alerts.unreadInquiries} unread inquiry${alerts.unreadInquiries === 1 ? "" : "ies"}`}
        />
      ) : null}
      {alerts.pendingPayments > 0 ? (
        <FooterAlertPill
          href="/orders"
          tone="warn"
          label={`${alerts.pendingPayments} pending payment${alerts.pendingPayments === 1 ? "" : "s"}`}
        />
      ) : null}
      {alerts.lowStockVariants > 0 ? (
        <FooterAlertPill
          href="/products"
          tone="warn"
          label={`${alerts.lowStockVariants} low stock`}
        />
      ) : null}
      {alerts.openInquiries > 0 && alerts.unreadInquiries === 0 ? (
        <FooterAlertPill
          href="/inquiries"
          tone="neutral"
          label={`${alerts.openInquiries} open inquiry${alerts.openInquiries === 1 ? "" : "ies"}`}
        />
      ) : null}
    </div>
  );
}

export function AdminFooter() {
  const { siteName } = useStoreSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="hidden min-h-8 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-1.5 text-[10px] text-[var(--color-ink-500)] shadow-[var(--shadow-sm)] md:flex">
      <p className="min-w-0 truncate">
        © {year} {siteName} — Admin console
      </p>
      <AdminFooterAlerts />
    </footer>
  );
}
