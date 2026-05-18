import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock,
  Heart,
  Inbox,
  Receipt,
  ShieldAlert,
  Smartphone,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { KpiCard } from "@/components/KpiCard";
import { Sparkline } from "@/components/Sparkline";
import { StatusPill, type StatusTone } from "@/components/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { requirePageSession } from "@/lib/server/requirePageSession";
import { LOW_STOCK_VARIANT_THRESHOLD } from "@/lib/server/dashboardStats";
import {
  loadDashboardDailyRevenueCached,
  loadDashboardKpisCached,
  loadDashboardRecentInquiriesCached,
} from "@/lib/cached";
import { formatPrice, formatTimeAgo } from "@store/shared";
import { getInitials } from "@/lib/initials";
import type { InquiryStatus } from "@store/db";

export const dynamic = "force-dynamic";

/** Inquiries surfaced on the mobile dashboard tile (server fetches more for desktop hooks). */
const MOBILE_RECENT_INQUIRIES_COUNT = 5;
/** Trailing days of revenue plotted in the desktop KPI sparklines. */
const SPARKLINE_DATA_POINTS = 12;

/** Pakistani crore — 10 million; locale-specific compact-money rendering. */
const RUPEES_PER_CRORE = 10_000_000;
/** Pakistani lakh — 100 thousand. */
const RUPEES_PER_LAKH = 100_000;
/** Threshold above which we render `Rs Nk` instead of full digits. */
const RUPEES_PER_THOUSAND = 1_000;

const INQUIRY_TONE: Record<InquiryStatus, StatusTone> = {
  new: "info",
  "in-progress": "neutral",
  "awaiting-customer": "warn",
  won: "success",
  lost: "danger",
};

const INQUIRY_LABEL: Record<InquiryStatus, string> = {
  new: "New",
  "in-progress": "In progress",
  "awaiting-customer": "Awaiting customer",
  won: "Won",
  lost: "Lost",
};

function compactRupees(rupees: number): string {
  if (rupees >= RUPEES_PER_CRORE) {
    return `Rs ${(rupees / RUPEES_PER_CRORE).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (rupees >= RUPEES_PER_LAKH) {
    return `Rs ${(rupees / RUPEES_PER_LAKH).toFixed(2).replace(/\.?0+$/, "")} L`;
  }
  if (rupees >= RUPEES_PER_THOUSAND) {
    return `Rs ${(rupees / RUPEES_PER_THOUSAND).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return formatPrice(rupees);
}

/**
 * Admin overview / dashboard.
 *
 * Render strategy — static-first, independently-streaming sections:
 *   1. `requirePageSession()` is the only top-level await — fast auth
 *      check that gates the entire page (without a session there's
 *      nothing to show).
 *   2. The shell + every static section header (eyebrows, titles,
 *      subtitles, "View all" links) renders synchronously, so on
 *      navigation the user sees the layout, headings, and quick links
 *      immediately.
 *   3. Each data block sits behind its own `<Suspense>` boundary and
 *      awaits ONLY the slice it needs:
 *        • KPI grids       → `loadDashboardKpisCached` (~15 aggregations)
 *        • Sparkline data  → `loadDashboardDailyRevenueCached` (1 agg)
 *        • Recent inquiries→ `loadDashboardRecentInquiriesCached` (1 find)
 *      No bundled "wait for everything" fetch — the recent-inquiries
 *      list lights up the instant its lightweight find returns, the
 *      sparklines light up when the daily-revenue aggregation lands,
 *      and the KPI grids light up when their share is ready. Each
 *      skeleton clears the moment its own data arrives.
 *
 * Net effect: the page paints in <50ms, content streams in piece by piece.
 */
export default async function AdminOverviewPage() {
  await requirePageSession("/");

  return (
    <AdminShell>
      {/* Mobile only — compact native layout */}
      <div className="md:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Overview
          </p>
          <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
            Welcome back
          </h1>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>Today</span>
            <Link href="/products/new">+ Add product</Link>
          </div>
          <Suspense fallback={<MobileKpiGridFallback />}>
            <MobileTodayKpis />
          </Suspense>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>This month</span>
            <Link href="/inquiries">View all</Link>
          </div>
          <Suspense fallback={<MobileKpiGridFallback />}>
            <MobileMonthKpis />
          </Suspense>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>Recent inquiries</span>
            <Link href="/inquiries">View all</Link>
          </div>
          <Suspense fallback={<MobileInquiriesFallback />}>
            <MobileRecentInquiries />
          </Suspense>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block">
        <SectionHeader
          title="How the shop is performing"
          subtitle="Live snapshot across today, this week, and this month."
        />
        <Suspense fallback={<DesktopKpiGridFallback />}>
          <DesktopPerformanceKpis />
        </Suspense>

        <SectionHeader
          title="What needs your attention"
          subtitle="Pending payments first, then dispatch and delivery."
          action={{ href: "/inquiries", label: "Open inquiries" }}
        />
        <Suspense fallback={<DesktopKpiGridFallback />}>
          <DesktopAttentionKpis />
        </Suspense>

        <SectionHeader
          title="What's in stock and what's hot"
          subtitle="Stock, low-stock alerts, listings, and inquiry inbox."
          action={{ href: "/products", label: "Manage products" }}
        />
        <Suspense fallback={<DesktopKpiGridFallback />}>
          <DesktopStockKpis />
        </Suspense>
      </div>
    </AdminShell>
  );
}

/* ─────────────────────────── Mobile data slots ─────────────────────────── */

async function MobileTodayKpis() {
  const kpis = await loadDashboardKpisCached();
  return (
    <div className="grid grid-cols-2 gap-2">
      <MobileStat
        label="Orders"
        value={String(kpis.ordersToday)}
        icon={<Receipt size={14} />}
        changePercent={kpis.changePercents.ordersToday}
      />
      <MobileStat
        label="Sales"
        value={compactRupees(kpis.salesTodayRupees)}
        icon={<TrendingUp size={14} />}
        changePercent={kpis.changePercents.salesToday}
      />
      <MobileStat
        label="Pending"
        value={String(kpis.pendingPayments)}
        icon={<Clock size={14} />}
      />
      <MobileStat
        label="Confirmed"
        value={String(kpis.confirmedPayments)}
        icon={<CheckCircle2 size={14} />}
      />
    </div>
  );
}

async function MobileMonthKpis() {
  const kpis = await loadDashboardKpisCached();
  return (
    <div className="grid grid-cols-2 gap-2">
      <MobileStat
        label="Orders"
        value={String(kpis.ordersThisMonth)}
        icon={<CalendarDays size={14} />}
        changePercent={kpis.changePercents.ordersMonth}
      />
      <MobileStat
        label="Revenue"
        value={compactRupees(kpis.salesThisMonthRupees)}
        icon={<Wallet size={14} />}
        changePercent={kpis.changePercents.salesMonth}
      />
      <MobileStat
        label="Customers"
        value={String(kpis.totalCustomers)}
        icon={<Users size={14} />}
        changePercent={kpis.changePercents.customers}
      />
      <MobileStat
        label="Loyalty"
        value={String(kpis.loyaltyMembers)}
        icon={<Heart size={14} />}
        changePercent={kpis.changePercents.loyalty}
      />
    </div>
  );
}

async function MobileRecentInquiries() {
  const recentInquiries = await loadDashboardRecentInquiriesCached();
  const nowReferenceIso = new Date().toISOString();
  return (
    <ul className="app-list">
      {recentInquiries.length === 0 ? (
        <li className="app-list-row text-[12px] text-[var(--color-ink-500)]">
          No inquiries yet.
        </li>
      ) : (
        recentInquiries.slice(0, MOBILE_RECENT_INQUIRIES_COUNT).map((inquiry) => {
          const status = inquiry.status as InquiryStatus;
          return (
            <li key={inquiry.id} className="app-list-row">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
                {getInitials(inquiry.customerName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-[13px] font-semibold text-[var(--color-ink-900)]">
                    {inquiry.customerName}
                  </p>
                  <StatusPill tone={INQUIRY_TONE[status] ?? "neutral"}>
                    {INQUIRY_LABEL[status] ?? inquiry.status}
                  </StatusPill>
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-[var(--color-ink-500)]">
                  {inquiry.modelName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-semibold text-[var(--color-ink-900)]">
                  {inquiry.expectedRupees ? formatPrice(inquiry.expectedRupees) : "—"}
                </p>
                <p className="mt-0.5 text-[10.5px] text-[var(--color-ink-400)]">
                  {formatTimeAgo(inquiry.receivedAt, nowReferenceIso)}
                </p>
              </div>
            </li>
          );
        })
      )}
    </ul>
  );
}

/* ─────────────────────────── Desktop data slots ─────────────────────────── */

async function DesktopPerformanceKpis() {
  // Two independent cached reads kicked off in parallel: KPIs (~15
  // aggregations) and the daily-revenue sparkline series (1 aggregation).
  // The Suspense boundary unblocks the moment the slower of the two lands.
  const [kpis, dailyRevenue] = await Promise.all([
    loadDashboardKpisCached(),
    loadDashboardDailyRevenueCached(),
  ]);
  const revenueValues = dailyRevenue.map((day) => day.rupees);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Orders today"
        value={String(kpis.ordersToday)}
        changePercent={kpis.changePercents.ordersToday}
        changeLabel="vs yesterday"
        icon={<Receipt size={15} />}
        hint={`${compactRupees(kpis.salesTodayRupees)} in sales`}
      />
      <KpiCard
        label="Orders this week"
        value={String(kpis.ordersThisWeek)}
        changePercent={kpis.changePercents.ordersWeek}
        changeLabel="vs last week"
        icon={<CalendarRange size={15} />}
        hint={compactRupees(kpis.salesThisWeekRupees)}
      />
      <KpiCard
        label="Orders this month"
        value={String(kpis.ordersThisMonth)}
        changePercent={kpis.changePercents.ordersMonth}
        changeLabel="vs last month"
        icon={<CalendarDays size={15} />}
        spark={<Sparkline values={revenueValues.slice(-SPARKLINE_DATA_POINTS)} />}
      />
      <KpiCard
        tone="accent"
        label="Sales this month"
        value={compactRupees(kpis.salesThisMonthRupees)}
        changePercent={kpis.changePercents.salesMonth}
        changeLabel="vs last month"
        icon={<TrendingUp size={15} />}
        spark={<Sparkline values={revenueValues.slice(-SPARKLINE_DATA_POINTS)} />}
      />
    </div>
  );
}

async function DesktopAttentionKpis() {
  const kpis = await loadDashboardKpisCached();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        tone="warn"
        label="Pending payments"
        value={String(kpis.pendingPayments)}
        icon={<Clock size={15} />}
        hint="Awaiting confirmation"
      />
      <KpiCard
        tone="accent"
        label="Confirmed payments"
        value={String(kpis.confirmedPayments)}
        icon={<CheckCircle2 size={15} />}
        hint="Ready to dispatch"
      />
      <KpiCard
        tone="info"
        label="Dispatched"
        value={String(kpis.dispatched)}
        icon={<Truck size={15} />}
        hint="In transit"
      />
      <KpiCard
        tone="danger"
        label="Refunds this month"
        value={String(kpis.moneyBackClaimsThisMonth)}
        icon={<ShieldAlert size={15} />}
        hint="Open this month"
      />
    </div>
  );
}

async function DesktopStockKpis() {
  const kpis = await loadDashboardKpisCached();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Units in stock"
        value={String(kpis.unitsInStock)}
        icon={<Boxes size={15} />}
      />
      <KpiCard
        tone="warn"
        label="Low stock alerts"
        value={String(kpis.lowStockVariants)}
        icon={<AlertTriangle size={15} />}
        hint={`Variants ≤ ${LOW_STOCK_VARIANT_THRESHOLD} units`}
      />
      <KpiCard
        label="Models listed"
        value={String(kpis.modelsListed)}
        icon={<Smartphone size={15} />}
        hint={`${kpis.unitsSoldThisMonth} sold this month`}
      />
      <KpiCard
        label="Open inquiries"
        value={String(kpis.openInquiries)}
        changePercent={kpis.changePercents.inquiries}
        changeLabel="vs last week"
        icon={<Inbox size={15} />}
      />
    </div>
  );
}

/* ─────────────────────────── Skeleton fallbacks ─────────────────────────── */

const KPI_FALLBACK_COUNT = 4;
const INQUIRY_FALLBACK_COUNT = 5;

function MobileKpiGridFallback() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: KPI_FALLBACK_COUNT }).map((_, index) => (
        <div
          key={index}
          className="rounded-[12px] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton shape="text" className="h-3 w-16" />
            <Skeleton className="size-6" />
          </div>
          <Skeleton shape="text" className="mt-2 h-5 w-24" />
          <Skeleton shape="text" className="mt-1 h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

function MobileInquiriesFallback() {
  return (
    <ul className="app-list">
      {Array.from({ length: INQUIRY_FALLBACK_COUNT }).map((_, index) => (
        <li key={index} className="app-list-row">
          <Skeleton shape="circle" className="size-8 shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Skeleton shape="text" className="h-3 w-24" />
              <Skeleton shape="pill" className="h-3.5 w-12" />
            </div>
            <Skeleton shape="text" className="h-3 w-32" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton shape="text" className="h-3 w-16" />
            <Skeleton shape="text" className="h-2.5 w-10" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function DesktopKpiGridFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: KPI_FALLBACK_COUNT }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton shape="text" className="h-3 w-24" />
            <Skeleton className="size-7" />
          </div>
          <Skeleton shape="text" className="mt-6 h-7 w-32" />
          <div className="mt-4 flex items-center justify-between gap-2">
            <Skeleton shape="text" className="h-3 w-20" />
            <Skeleton shape="text" className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Small shared pieces ─────────────────────────── */

interface MobileStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  changePercent?: number;
}

function MobileStat({ label, value, icon, changePercent }: MobileStatProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  return (
    <div className="rounded-[12px] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
          {label}
        </p>
        <span className="grid size-6 place-items-center rounded-md bg-[var(--color-canvas-deep)] text-[var(--color-ink-600)]">
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[16px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
        {value}
      </p>
      {typeof changePercent === "number" && (
        <p
          className={`mt-1 text-[10.5px] font-semibold ${
            isPositive ? "text-[var(--color-accent-700)]" : "text-rose-600"
          }`}
        >
          {isPositive ? "↑" : "↓"} {Math.abs(changePercent)}%
        </p>
      )}
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: { href: string; label: string };
}

function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    <header className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="mt-1 text-base font-semibold tracking-tight text-[var(--color-ink-900)]">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-accent-700)] hover:underline"
        >
          {action.label} <ArrowRight size={12} />
        </Link>
      )}
    </header>
  );
}
