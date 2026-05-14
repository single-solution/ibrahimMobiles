import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Inbox,
  PackageCheck,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PageTitle } from "@/components/admin/PageTitle";
import { KpiCard } from "@/components/admin/KpiCard";
import { Sparkline } from "@/components/admin/Sparkline";
import { MiniBarChart } from "@/components/admin/MiniBarChart";
import { DonutChart } from "@/components/admin/DonutChart";
import { StatusPill, type StatusTone } from "@/components/admin/StatusPill";
import {
  adminKpis,
  dailyRevenueSeries,
  stockTypeDistribution,
} from "@/data/admin/kpis";
import {
  getInquirySourceLabel,
  getInquiryStatusLabel,
  inquiries,
  type InquiryStatus,
} from "@/data/admin/inquiries";
import { formatPrice, formatTimeAgo } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";

const NOW_REFERENCE_ISO = "2026-05-13T21:00:00.000Z";

const STATUS_TONE: Record<InquiryStatus, StatusTone> = {
  new: "info",
  contacted: "neutral",
  "advance-paid": "accent",
  "video-sent": "info",
  dispatched: "warn",
  delivered: "success",
  cancelled: "danger",
  "money-back": "danger",
};

export default function AdminOverviewPage() {
  const recentInquiries = inquiries.slice(0, 5);
  const revenueValues = dailyRevenueSeries.map((entry) => entry.rupees);
  const revenueLabels = dailyRevenueSeries.map((entry) => entry.date);

  return (
    <AdminShell>
      {/* Mobile only — native */}
      <div className="md:hidden">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            Overview
          </p>
          <h1 className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
            Welcome back, Ibrahim
          </h1>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>Today</span>
            <Link href="/admin/products/new">+ Add product</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MobileStat
              label="Units"
              value={String(adminKpis.unitsInStock)}
              icon={<Boxes size={14} />}
              changePercent={adminKpis.changePercents.units}
            />
            <MobileStat
              label="Revenue"
              value={formatPrice(adminKpis.revenueThisMonthRupees)}
              icon={<TrendingUp size={14} />}
              changePercent={adminKpis.changePercents.revenue}
            />
            <MobileStat
              label="Inquiries"
              value={String(adminKpis.openInquiries)}
              icon={<Inbox size={14} />}
              changePercent={adminKpis.changePercents.inquiries}
            />
            <MobileStat
              label="AOV"
              value={formatPrice(adminKpis.averageOrderValueRupees)}
              icon={<PackageCheck size={14} />}
              changePercent={adminKpis.changePercents.aov}
            />
          </div>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>Last 30 days</span>
            <span className="lowercase tracking-normal text-[var(--color-ink-500)]">
              avg {formatPrice(Math.round(adminKpis.revenueThisMonthRupees / 30))}/day
            </span>
          </div>
          <div className="rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
            <MiniBarChart
              values={revenueValues}
              labels={revenueLabels}
              height={140}
              formatValue={(value) => formatPrice(value)}
            />
          </div>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>Stock by type</span>
            <span className="lowercase tracking-normal text-[var(--color-ink-500)]">
              {adminKpis.unitsInStock} units
            </span>
          </div>
          <div className="rounded-[14px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
            <DonutChart
              segments={stockTypeDistribution}
              centerValue={String(adminKpis.unitsInStock)}
              centerLabel="Units"
            />
          </div>
        </div>

        <div className="app-section">
          <div className="app-section-eyebrow">
            <span>Recent inquiries</span>
            <Link href="/admin/inquiries">View all</Link>
          </div>
          <ul className="app-list">
            {recentInquiries.map((inquiry) => (
              <li key={inquiry.id} className="app-list-row">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[11px] font-semibold text-[var(--color-ink-700)]">
                  {getInitials(inquiry.customerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[13px] font-semibold text-[var(--color-ink-900)]">
                      {inquiry.customerName}
                    </p>
                    <StatusPill tone={STATUS_TONE[inquiry.status]}>
                      {getInquiryStatusLabel(inquiry.status)}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-[var(--color-ink-500)]">
                    {inquiry.modelName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-semibold text-[var(--color-ink-900)]">
                    {formatPrice(inquiry.expectedRupees)}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--color-ink-400)]">
                    {formatTimeAgo(inquiry.receivedAt, NOW_REFERENCE_ISO)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Desktop — single layout */}
      <div className="hidden md:block">
        <PageTitle
          eyebrow="Overview"
          title="Welcome back, Ibrahim"
          actions={
            <ButtonLink
              href="/admin/products/new"
              variant="primary"
              size="sm"
              leadingIcon={<Smartphone size={14} />}
            >
              Add product
            </ButtonLink>
          }
        />

        <section className="mt-8 grid grid-cols-4 gap-5">
          <KpiCard
            label="Units in stock"
            value={String(adminKpis.unitsInStock)}
            changePercent={adminKpis.changePercents.units}
            changeLabel="vs last month"
            icon={<Boxes size={15} />}
            spark={<Sparkline values={[68, 72, 75, 78, 82, 85, 87]} />}
          />
          <KpiCard
            label="Revenue this month"
            value={formatPrice(adminKpis.revenueThisMonthRupees)}
            changePercent={adminKpis.changePercents.revenue}
            changeLabel="vs last month"
            icon={<TrendingUp size={15} />}
            spark={<Sparkline values={revenueValues.slice(-12)} />}
          />
          <KpiCard
            label="Open inquiries"
            value={String(adminKpis.openInquiries)}
            changePercent={adminKpis.changePercents.inquiries}
            changeLabel="vs last week"
            icon={<Inbox size={15} />}
          />
          <KpiCard
            label="Avg order value"
            value={formatPrice(adminKpis.averageOrderValueRupees)}
            changePercent={adminKpis.changePercents.aov}
            changeLabel="vs last month"
            icon={<PackageCheck size={15} />}
          />
        </section>

        <section className="mt-8 grid grid-cols-3 gap-6">
          <Panel
            eyebrow="Last 30 days"
            title="Daily revenue"
            subtitle={`Average ${formatPrice(Math.round(adminKpis.revenueThisMonthRupees / 30))} / day`}
            className="col-span-2"
          >
            <div className="px-7 pb-7 pt-3">
              <MiniBarChart
                values={revenueValues}
                labels={revenueLabels}
                height={200}
                formatValue={(value) => formatPrice(value)}
              />
            </div>
          </Panel>

          <Panel
            eyebrow="Inventory mix"
            title="Stock by type"
            subtitle={`${adminKpis.unitsInStock} units across ${adminKpis.modelsListed} models`}
          >
            <div className="px-7 pb-7 pt-3">
              <DonutChart
                segments={stockTypeDistribution}
                centerValue={String(adminKpis.unitsInStock)}
                centerLabel="Units"
              />
            </div>
          </Panel>
        </section>

        <Panel
          className="mt-8"
          eyebrow="Recent inquiries"
          title={`${adminKpis.openInquiries} open`}
          action={{ href: "/admin/inquiries", label: "View all" }}
        >
          <ul className="divide-y divide-[var(--color-ink-100)]">
            {recentInquiries.map((inquiry) => (
              <li key={inquiry.id} className="flex items-center gap-3 px-7 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-canvas-deep)] text-[12px] font-semibold text-[var(--color-ink-700)]">
                  {getInitials(inquiry.customerName)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                      {inquiry.customerName}
                    </p>
                    <StatusPill tone={STATUS_TONE[inquiry.status]}>
                      {getInquiryStatusLabel(inquiry.status)}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-ink-500)]">
                    {inquiry.modelName} · {getInquirySourceLabel(inquiry.source)} · {inquiry.customerCity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                    {formatPrice(inquiry.expectedRupees)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-400)]">
                    {formatTimeAgo(inquiry.receivedAt, NOW_REFERENCE_ISO)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AdminShell>
  );
}

interface MobileStatProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  changePercent?: number;
}

function MobileStat({ label, value, icon, changePercent }: MobileStatProps) {
  const isPositive = (changePercent ?? 0) >= 0;
  return (
    <div className="rounded-[12px] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
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

interface PanelProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}

function Panel({ eyebrow, title, subtitle, action, className, children }: PanelProps) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-ink-100)] px-7 py-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            {eyebrow}
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-[var(--color-ink-900)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{subtitle}</p>}
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
      {children}
    </section>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("");
}
