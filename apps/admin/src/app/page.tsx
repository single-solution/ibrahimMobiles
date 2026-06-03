import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarDays,
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
import { Shell } from "@/components/layout/Shell";
import { DashboardAccessBanner } from "@/app/_components/dashboard/DashboardAccessBanner";
import { MobileHubSections } from "@/app/_components/dashboard/MobileHubSections";
import {
  DashboardMobileEyebrowActions,
  DashboardSectionActionLink,
} from "@/app/_components/dashboard/DashboardQuickLinks";
import { PerformancePeriodSelector } from "@/app/_components/dashboard/PerformancePeriodSelector";
import { ShopHealthCard } from "@/app/_components/dashboard/ShopHealthCard";
import { KpiCard } from "@/app/_components/dashboard/KpiCard";
import { Sparkline } from "@/app/_components/dashboard/Sparkline";
import { StatusPill, type StatusTone } from "@/components/shared/StatusPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { requirePageSession } from "@/lib/server/requirePageSession";
import {
  isPerformanceCompare,
  isPerformanceRange,
  type PerformanceCompare,
  type PerformanceRange,
} from "@/lib/dashboard/performancePeriod";
import { LOW_STOCK_VARIANT_THRESHOLD } from "@/lib/server/dashboardStats";
import {
  loadDashboardKpisCached,
  loadDashboardRecentInquiriesCached,
  loadPerformanceSummaryCached,
  loadShopHealthCached,
} from "@/lib/cached";
import { classNames, formatPrice, formatTimeAgo } from "@store/shared";
import { getInitials } from "@/lib/initials";
import { getStoreSettings, type InquiryStatus } from "@store/db";

export const dynamic = "force-dynamic";

interface AdminOverviewSearchParams {
  range?: string;
  compare?: string;
}

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
  open: "info",
  "awaiting-customer": "warn",
  resolved: "success",
};

const INQUIRY_LABEL: Record<InquiryStatus, string> = {
  open: "Open",
  "awaiting-customer": "Awaiting customer",
  resolved: "Resolved",
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
export default async function AdminOverviewPage({
  searchParams,
}: {
  // Next 16 hands these in async — preserve that signature so we don't
  // regress on the streaming render.
  searchParams?: Promise<AdminOverviewSearchParams>;
}) {
  await requirePageSession("/");
  const resolved = (await searchParams) ?? {};
  const range: PerformanceRange = isPerformanceRange(resolved.range)
    ? resolved.range
    : "month";
  const compare: PerformanceCompare = isPerformanceCompare(resolved.compare)
    ? resolved.compare
    : "previous";

  return (
    <Shell>
      <Suspense fallback={null}>
        <DashboardAccessBanner />
      </Suspense>
      {/* Mobile only — compact native layout */}
      <div className="reveal-stagger md:hidden">
        <div className="reveal">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            Overview
          </p>
          <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
            Welcome back
          </h1>
        </div>

        <Suspense fallback={<MobileHubFallback />}>
          <MobileHubSections />
        </Suspense>

        <div className="reveal app-section">
          <div className="app-section-eyebrow">
            <span>Today</span>
            <DashboardMobileEyebrowActions variant="today" />
          </div>
          <Suspense fallback={<MobileKpiGridFallback />}>
            <MobileTodayKpis />
          </Suspense>
        </div>

        <div className="reveal app-section">
          <div className="app-section-eyebrow">
            <span>This month</span>
            <DashboardMobileEyebrowActions variant="month" />
          </div>
          <Suspense fallback={<MobileKpiGridFallback />}>
            <MobileMonthKpis />
          </Suspense>
        </div>

        <div className="reveal app-section">
          <div className="app-section-eyebrow">
            <span>Shop health</span>
          </div>
          <Suspense fallback={<ShopHealthFallback />}>
            <ShopHealthSection />
          </Suspense>
        </div>

        <div className="reveal app-section">
          <div className="app-section-eyebrow">
            <span>Recent inquiries</span>
            <DashboardMobileEyebrowActions variant="inquiries" />
          </div>
          <Suspense fallback={<MobileInquiriesFallback />}>
            <MobileRecentInquiries />
          </Suspense>
        </div>
      </div>

      {/* Desktop layout — Bento-style grid to maximize horizontal space.
          Uses a 12-column grid on xl screens (8 for main metrics, 4 for insights). */}
      <div className="reveal-stagger hidden md:block">
        <div className="mx-auto max-w-[1600px]">
          <div className="grid items-start gap-6 xl:grid-cols-12">
            
            {/* Main Metric Column */}
            <div className="min-w-0 flex-1 space-y-6 xl:col-span-8">
              <section className="reveal">
                <SectionHeader
                  title="Performance"
                  subtitle="Pick a window — every tile re-runs against your chosen range and comparison."
                  action={
                    <Suspense fallback={<PeriodSelectorFallback />}>
                      <PerformancePeriodSelector range={range} compare={compare} />
                    </Suspense>
                  }
                />
                <Suspense
                  key={`${range}-${compare}`}
                  fallback={<DesktopPerformanceFallback />}
                >
                  <DesktopPerformancePanel range={range} compare={compare} />
                </Suspense>
              </section>

              <section className="reveal">
                <SectionHeader
                  title="What needs your attention"
                  subtitle="Pending payments first, then dispatch and delivery."
                  action={
                    <DashboardSectionActionLink
                      href="/inquiries"
                      label="Open inquiries"
                      permission="inquiry_view"
                    />
                  }
                />
                <Suspense fallback={<DesktopKpiGridFallback />}>
                  <DesktopAttentionKpis />
                </Suspense>
              </section>

              <section className="reveal">
                <SectionHeader
                  title="What's in stock and what's hot"
                  subtitle="Stock, low-stock alerts, listings, and inquiry inbox."
                  action={
                    <DashboardSectionActionLink
                      href="/products"
                      label="Manage products"
                      permission="product_view"
                    />
                  }
                />
                <Suspense fallback={<DesktopKpiGridFallback />}>
                  <DesktopStockKpis />
                </Suspense>
              </section>
            </div>

            {/* Insights & Health Column */}
            <div className="min-w-0 flex-1 space-y-6 xl:col-span-4">
              <section className="reveal">
                <SectionHeader
                  title="Quick insights & health"
                  subtitle="Configuration, catalog hygiene, and recent inquiries."
                />
                <div className="flex flex-col gap-4">
                  <Suspense fallback={<ShopHealthFallback />}>
                    <ShopHealthSection />
                  </Suspense>
                  <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
                    <Suspense fallback={<DesktopRecentInquiriesFallback />}>
                      <DesktopRecentInquiries />
                    </Suspense>
                  </div>
                </div>
              </section>
            </div>

          </div>
        </div>
      </div>
    </Shell>
  );
}

/**
 * Shared grid for every desktop KPI strip on this page. Tighter than the
 * old `gap-4` spacing and breaks to 4-up at `lg:` (instead of `xl:`) so a
 * 13" laptop fits a full row without horizontal compromises. On 2xl
 * monitors all four cards still occupy comfortable widths — the constraint
 * is no longer the grid, it's the dashboard container.
 */
const DESKTOP_KPI_GRID =
  "reveal-stagger grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-ink-100)] border border-[var(--color-ink-100)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]";

/* ─────────────────────────── Mobile data slots ─────────────────────────── */

async function MobileTodayKpis() {
  const kpis = await loadDashboardKpisCached();
  return (
    <div className="reveal-stagger grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-ink-100)] shadow-[var(--shadow-sm)]">
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
    <div className="reveal-stagger grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-ink-100)] shadow-[var(--shadow-sm)]">
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
            <li key={inquiry.id}>
              <Link
                href={`/inquiries?inquiry=${inquiry.id}`}
                title={inquiry.subjectProductName ?? inquiry.lastMessagePreview}
                className="app-list-row tap flex"
              >
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
              </div>
              <div className="text-right">
                {inquiry.unreadByTeam > 0 ? (
                  <StatusPill tone="danger">{inquiry.unreadByTeam}</StatusPill>
                ) : (
                  <span className="text-[10.5px] font-medium text-[var(--color-ink-400)]">
                    {formatTimeAgo(inquiry.lastMessageAt, nowReferenceIso)}
                  </span>
                )}
              </div>
              </Link>
            </li>
          );
        })
      )}
    </ul>
  );
}

/* ─────────────────────────── Desktop data slots ─────────────────────────── */

async function DesktopPerformancePanel({
  range,
  compare,
}: {
  range: PerformanceRange;
  compare: PerformanceCompare;
}) {
  const summary = await loadPerformanceSummaryCached(range, compare);
  const sparkValues = summary.dailySeries.map((day) => day.rupees);
  return (
    <div className={DESKTOP_KPI_GRID}>
      <KpiCard
        label={`Orders · ${summary.period.rangeLabel}`}
        value={String(summary.orders)}
        changePercent={summary.ordersChangePercent}
        changeLabel={summary.period.comparisonLabel}
        icon={<Receipt size={15} />}
      />
      <KpiCard
        tone="accent"
        label={`Sales · ${summary.period.rangeLabel}`}
        value={compactRupees(summary.salesRupees)}
        changePercent={summary.salesChangePercent}
        changeLabel={summary.period.comparisonLabel}
        icon={<TrendingUp size={15} />}
        spark={
          sparkValues.length > 1 ? (
            <Sparkline values={sparkValues.slice(-SPARKLINE_DATA_POINTS)} />
          ) : undefined
        }
      />
      <KpiCard
        label="Average order value"
        value={
          summary.averageOrderRupees > 0
            ? compactRupees(summary.averageOrderRupees)
            : "—"
        }
        changePercent={
          summary.orders > 0 ? summary.averageOrderChangePercent : undefined
        }
        changeLabel={summary.period.comparisonLabel}
        icon={<Wallet size={15} />}
      />
      <KpiCard
        label="Days with orders"
        value={String(summary.dailySeries.filter((day) => day.rupees > 0).length)}
        hint={`${summary.dailySeries.length} ${summary.dailySeries.length === 1 ? "day" : "days"} in window`}
        icon={<CalendarDays size={15} />}
      />
    </div>
  );
}

async function ShopHealthSection() {
  const summary = await loadShopHealthCached();
  return <ShopHealthCard summary={summary} />;
}

async function DesktopAttentionKpis() {
  const kpis = await loadDashboardKpisCached();
  return (
    <div className={DESKTOP_KPI_GRID}>
      <KpiCard
        tone="warn"
        label="Pending payments"
        value={String(kpis.pendingPayments)}
        icon={<Clock size={15} />}
        hint="Awaiting confirmation"
      />
      <KpiCard
        label="Confirmed payments"
        value={String(kpis.confirmedPayments)}
        icon={<CheckCircle2 size={15} />}
        hint="Ready to dispatch"
      />
      <KpiCard
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
  const [kpis, settings] = await Promise.all([
    loadDashboardKpisCached(),
    getStoreSettings().catch(() => null),
  ]);
  const lowStockHintCount =
    settings && Number.isFinite(settings.lowStockThreshold) && settings.lowStockThreshold >= 0
      ? Math.floor(settings.lowStockThreshold)
      : LOW_STOCK_VARIANT_THRESHOLD;
  return (
    <div className={DESKTOP_KPI_GRID}>
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
        hint={`Variants ≤ ${lowStockHintCount} units`}
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

/** Compact recent-inquiries count for the desktop right-rail panel. */
const DESKTOP_RECENT_INQUIRIES_COUNT = 4;

async function DesktopRecentInquiries() {
  const recentInquiries = await loadDashboardRecentInquiriesCached();
  const nowReferenceIso = new Date().toISOString();
  const items = recentInquiries.slice(0, DESKTOP_RECENT_INQUIRIES_COUNT);
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-ink-100)] px-4 py-2.5 md:px-5 bg-[var(--color-canvas-deep)]">
        <p className="text-[13px] font-semibold text-[var(--color-ink-900)] md:text-sm">
          Recent inquiries
        </p>
        <Link
          href="/inquiries"
          className="tap inline-flex items-center gap-1 text-[11.5px] font-semibold text-[var(--color-accent-700)] hover:text-[var(--color-accent-800)]"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-center text-[12.5px] text-[var(--color-ink-500)] md:px-5">
          No inquiries yet.
        </p>
      ) : (
        <ul className="reveal-stagger divide-y divide-[var(--color-ink-100)]">
          {items.map((inquiry) => {
            const status = inquiry.status as InquiryStatus;
            return (
              <li key={inquiry.id} className="reveal">
                <Link
                  href={`/inquiries?inquiry=${inquiry.id}`}
                  title={inquiry.subjectProductName ?? inquiry.lastMessagePreview}
                  className="tap flex items-center gap-3 px-4 py-3 md:px-5 hover:bg-[var(--color-canvas-deep)] transition-colors"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-canvas-deep)] text-[10px] font-semibold text-[var(--color-ink-700)]">
                    {getInitials(inquiry.customerName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12.5px] font-medium text-[var(--color-ink-900)]">
                        {inquiry.customerName}
                      </p>
                      {inquiry.unreadByTeam > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {inquiry.unreadByTeam}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-[var(--color-ink-400)]">
                    {formatTimeAgo(inquiry.lastMessageAt, nowReferenceIso)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function DesktopRecentInquiriesFallback() {
  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-ink-100)] px-4 py-2.5 md:px-5 bg-[var(--color-canvas-deep)]">
        <Skeleton shape="text" className="h-3.5 w-24" />
        <Skeleton shape="text" className="h-3 w-12" />
      </div>
      <ul className="divide-y divide-[var(--color-ink-100)]">
        {Array.from({ length: DESKTOP_RECENT_INQUIRIES_COUNT }).map((_, index) => (
          <li key={index} className="flex items-center gap-3 px-4 py-3 md:px-5">
            <Skeleton shape="circle" className="size-6 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton shape="text" className="h-3 w-20" />
              <Skeleton shape="text" className="h-2.5 w-28" />
            </div>
            <Skeleton shape="text" className="h-2.5 w-8" />
          </li>
        ))}
      </ul>
    </>
  );
}

/* ─────────────────────────── Skeleton fallbacks ─────────────────────────── */

const KPI_FALLBACK_COUNT = 4;
const INQUIRY_FALLBACK_COUNT = 5;

function MobileHubFallback() {
  return (
    <div className="app-section">
      <div className="app-section-eyebrow">
        <span>Jump to</span>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, groupIndex) => (
          <div key={groupIndex}>
            <Skeleton shape="text" className="mb-1.5 ml-1 h-2.5 w-16" />
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)]">
              {Array.from({ length: 3 }).map((_, rowIndex, rowArr) => (
                <div
                  key={rowIndex}
                  className={`flex h-12 items-center gap-3 px-3${
                    rowIndex < rowArr.length - 1
                      ? " border-b border-[var(--color-ink-100)]"
                      : ""
                  }`}
                >
                  <Skeleton className="size-8 shrink-0 rounded-[var(--radius-md)]" />
                  <Skeleton shape="text" className="h-3 w-24 flex-1" />
                  <Skeleton shape="text" className="h-3 w-10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileKpiGridFallback() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: KPI_FALLBACK_COUNT }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-3"
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
    <div className={DESKTOP_KPI_GRID}>
      {Array.from({ length: KPI_FALLBACK_COUNT }).map((_, index) => (
        <div
          key={index}
          // Match the compact KpiCard shape: eyebrow + icon, then a value
          // row with inline change. No trailing footer so the skeleton's
          // height matches the final card and there's no layout shift.
          className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] px-3 py-2.5 sm:px-3.5 sm:py-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton shape="text" className="h-3 w-20" />
            <Skeleton className="size-6" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <Skeleton shape="text" className="h-4 w-20" />
            <Skeleton shape="text" className="h-3 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DesktopPerformanceFallback() {
  return <DesktopKpiGridFallback />;
}

function ShopHealthFallback() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--color-ink-100)] px-4 py-2.5 md:px-5 bg-[var(--color-canvas-deep)]">
        <Skeleton shape="text" className="h-4 w-28" />
      </div>
      <div className="divide-y divide-[var(--color-ink-100)]">
        {Array.from({ length: 3 }).map((_, index) => (
          <ShopHealthRowSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

function ShopHealthRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 md:px-5">
      <Skeleton className="size-6 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton shape="text" className="h-3 w-48" />
        <Skeleton shape="text" className="h-2.5 w-64" />
      </div>
    </div>
  );
}

function PeriodSelectorFallback() {
  return (
    <div className="flex gap-2">
      <Skeleton shape="text" className="h-8 w-48" />
      <Skeleton shape="text" className="h-8 w-36" />
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
    <div className="bg-[var(--color-surface)] p-3.5 transition-colors hover:bg-[var(--color-canvas-deep)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[var(--color-ink-600)]">
          {label}
        </p>
        <span className="text-[var(--color-ink-400)]">
          {icon}
        </span>
      </div>
      <div className="mt-2.5">
        <p className="text-[20px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)]">
          {value}
        </p>
        {typeof changePercent === "number" && (
          <p
            className={classNames(
              "mt-2 flex items-center gap-0.5 text-[11px] font-semibold",
              isPositive ? "text-[var(--color-accent-700)]" : "text-rose-600",
            )}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
            {Math.abs(changePercent)}%
          </p>
        )}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

function SectionHeader({ eyebrow, title, subtitle, action }: SectionHeaderProps) {
  return (
    // Tightened from `mt-8 mb-3` — three sections of headers + 4-up KPI
    // grids was creating ~96px of pure header rhythm, now ~56px.
    <header className="mt-5 mb-2 flex flex-wrap items-end justify-between gap-2 first:mt-0">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="mt-0.5 text-[14px] font-semibold tracking-tight text-[var(--color-ink-900)] sm:text-[15px]">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
  );
}
