"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Bell, ExternalLink, Menu, ShoppingBag } from "lucide-react";

import { getInitials } from "@/lib/initials";
import { useStoreSettings } from "@/lib/storeSettingsContext";
import { getPublicSiteUrl } from "@/lib/seo/publicSiteUrl";
import { useAdminPermissions } from "@/lib/adminPermissionsContext";
import {
  totalAdminAlertCount,
  useAdminAlerts,
} from "@/components/adminAlertsUi";

interface AdminMobileTopBarProps {
  onOpenMenu: () => void;
}

/** Where the bell badge sends the user. Picks the highest-priority alert
 *  (unread inquiries > pending payments > low stock) and falls back to the
 *  inbox if every counter is zero. */
function bellHref(alertCount: {
  unreadInquiries: number;
  pendingPayments: number;
  lowStockVariants: number;
}): string {
  if (alertCount.unreadInquiries > 0) return "/inquiries";
  if (alertCount.pendingPayments > 0) return "/orders";
  if (alertCount.lowStockVariants > 0) return "/products";
  return "/inquiries";
}

export function AdminMobileTopBar({ onOpenMenu }: AdminMobileTopBarProps) {
  const { data: session } = useSession();
  const { siteName, storefrontUrl: configuredStorefrontUrl } = useStoreSettings();
  const { can } = useAdminPermissions();
  const alerts = useAdminAlerts();
  const initials = getInitials(session?.user?.name);
  const brandShort = siteName.split(" ")[0];
  const storefrontUrl = getPublicSiteUrl(configuredStorefrontUrl);

  const visibleAlerts = {
    unreadInquiries: can("inquiry_view") ? alerts.unreadInquiries : 0,
    pendingPayments: can("order_view") ? alerts.pendingPayments : 0,
    lowStockVariants: can("product_view") ? alerts.lowStockVariants : 0,
  };
  const badgeCount = totalAdminAlertCount({
    ...visibleAlerts,
    openInquiries: 0,
  });
  const badgeLabel = badgeCount > 9 ? "9+" : String(badgeCount);

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--color-ink-100)] bg-[var(--color-canvas)]/85 px-3 backdrop-blur md:hidden safe-top"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open admin menu"
        className="grid size-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-ink-700)] active:bg-[var(--color-canvas-deep)]"
      >
        <Menu size={20} />
      </button>

      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 text-[var(--color-ink-900)]"
      >
        <span className="grid size-7 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-500)] text-[var(--color-ink-900)]">
          <ShoppingBag size={13} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-700)]">
            Admin
          </p>
          <p className="truncate text-[13px] font-semibold tracking-tight text-[var(--color-ink-900)]">
            {brandShort} HQ
          </p>
        </div>
      </Link>

      <div className="ml-auto flex items-center gap-1">
        <Link
          href={storefrontUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View storefront"
          className="grid size-10 place-items-center rounded-full text-[var(--color-ink-600)] active:bg-[var(--color-canvas-deep)]"
        >
          <ExternalLink size={17} />
        </Link>
        <Link
          href={bellHref(visibleAlerts)}
          aria-label={
            badgeCount > 0
              ? `${badgeCount} pending notification${badgeCount === 1 ? "" : "s"}`
              : "No notifications"
          }
          className="relative grid size-10 place-items-center rounded-full text-[var(--color-ink-600)] active:bg-[var(--color-canvas-deep)]"
        >
          <Bell size={18} />
          {badgeCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--color-accent-500)] px-1 text-[9px] font-bold text-[var(--color-ink-900)]">
              {badgeLabel}
            </span>
          ) : null}
        </Link>
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-[var(--color-accent-500)] text-[11px] font-semibold text-[var(--color-ink-900)]"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
