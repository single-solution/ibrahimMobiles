"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	Clock,
	Compass,
	Cpu,
	ExternalLink,
	Eye,
	Gauge,
	Globe,
	Layers,
	Laptop,
	Monitor,
	MousePointerClick,
	Radio,
	Share2,
	ShoppingBag,
	Smartphone,
	Sparkles,
	Tablet,
	Timer,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import type { AnalyticsPeriod, AnalyticsSummary, FunnelSummary, SpeedInsightsSummary, WebVitalMetricSummary } from "@/lib/server/analyticsData";
import { classNames } from "@store/shared";

interface AnalyticsDashboardClientProps {
	initialSummary: AnalyticsSummary;
	initialSpeed: SpeedInsightsSummary;
	initialFunnel: FunnelSummary;
	period: AnalyticsPeriod;
}

const PERIOD_OPTIONS: Array<{ label: string; value: AnalyticsPeriod }> = [
	{ label: "Today (24h)", value: "24h" },
	{ label: "Last 7 Days", value: "7d" },
	{ label: "Last 30 Days", value: "30d" },
	{ label: "Last 90 Days", value: "90d" },
];

export function AnalyticsDashboardClient({ initialSummary, initialSpeed, initialFunnel, period }: AnalyticsDashboardClientProps) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<"traffic" | "speed" | "funnel">("traffic");

	function handlePeriodChange(newPeriod: AnalyticsPeriod) {
		router.push(`/analytics?period=${newPeriod}`);
	}

	return (
		<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
			{/* Top Header Bar */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2.5">
						<span className="grid size-8 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
							<BarChart3 size={18} strokeWidth={2.4} />
						</span>
						<h1 className="text-xl font-bold tracking-tight text-[var(--color-ink-900)]">Analytics & Speed Insights</h1>
					</div>
					<p className="mt-0.5 text-xs text-[var(--color-ink-500)]">
						Real-time visitor telemetry, storefront traffic, and Core Web Vitals performance.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{/* Live Indicator */}
					<div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
						</span>
						<span>{initialSummary.liveVisitors} Online Now</span>
					</div>

					{/* Period Selector */}
					<div className="flex rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-0.5 shadow-sm">
						{PERIOD_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => handlePeriodChange(opt.value)}
								className={classNames(
									"rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors",
									period === opt.value
										? "bg-[var(--color-accent-500)] text-white shadow-xs"
										: "text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Main Navigation Tabs */}
			<div className="flex border-b border-[var(--color-ink-100)]">
				<button
					type="button"
					onClick={() => setActiveTab("traffic")}
					className={classNames(
						"flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
						activeTab === "traffic"
							? "border-[var(--color-accent-500)] text-[var(--color-accent-700)]"
							: "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]",
					)}
				>
					<Eye size={15} />
					Traffic & Visitors
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("speed")}
					className={classNames(
						"flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
						activeTab === "speed"
							? "border-[var(--color-accent-500)] text-[var(--color-accent-700)]"
							: "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]",
					)}
				>
					<Gauge size={15} />
					Speed Insights (Core Web Vitals)
					<span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
						{initialSpeed.overallScore}/100
					</span>
				</button>
				<button
					type="button"
					onClick={() => setActiveTab("funnel")}
					className={classNames(
						"flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors",
						activeTab === "funnel"
							? "border-[var(--color-accent-500)] text-[var(--color-accent-700)]"
							: "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-800)]",
					)}
				>
					<Layers size={15} />
					Conversion Funnel
				</button>
			</div>

			{/* TAB 1: Traffic & Visitors */}
			{activeTab === "traffic" && (
				<div className="flex flex-col gap-4">
					{/* KPI Stats Grid */}
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<KpiCard
							title="Total Pageviews"
							value={initialSummary.totalPageViews.toLocaleString()}
							change={initialSummary.pageViewsChange}
							icon={Eye}
						/>
						<KpiCard
							title="Unique Visitors"
							value={initialSummary.uniqueVisitors.toLocaleString()}
							change={initialSummary.uniqueVisitorsChange}
							icon={Users}
						/>
						<KpiCard
							title="Avg Time on Store"
							value={`${Math.floor(initialSummary.avgDurationSeconds / 60)}m ${initialSummary.avgDurationSeconds % 60}s`}
							subtext="Per active session"
							icon={Clock}
						/>
						<KpiCard
							title="Estimated Bounce Rate"
							value={`${initialSummary.bounceRate}%`}
							subtext="Single-page visits"
							icon={MousePointerClick}
						/>
					</div>

					{/* Middle Grids: Top Pages & Top Referrers */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{/* Top Visited Pages */}
						<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
							<div className="mb-3 flex items-center justify-between">
								<h3 className="text-sm font-bold text-[var(--color-ink-900)]">Top Landing & Store Pages</h3>
								<span className="text-xs text-[var(--color-ink-400)]">{initialSummary.topPages.length} pages tracked</span>
							</div>

							{initialSummary.topPages.length === 0 ? (
								<p className="py-8 text-center text-xs text-[var(--color-ink-400)]">No pageview data recorded yet.</p>
							) : (
								<div className="divide-y divide-[var(--color-ink-50)] text-xs">
									{initialSummary.topPages.map((page, idx) => (
										<div key={idx} className="flex items-center justify-between py-2">
											<div className="min-w-0 flex-1 pr-3">
												<p className="truncate font-medium text-[var(--color-ink-900)]">{page.title || page.path}</p>
												<p className="truncate font-mono text-[11px] text-[var(--color-ink-400)]">{page.path}</p>
											</div>
											<div className="text-right">
												<span className="font-bold text-[var(--color-ink-900)]">{page.views.toLocaleString()}</span>
												<span className="ml-1 text-[11px] text-[var(--color-ink-400)]">views</span>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Traffic Sources / Referrers */}
						<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
							<div className="mb-3 flex items-center justify-between">
								<h3 className="text-sm font-bold text-[var(--color-ink-900)]">Top Acquisition Channels & Referrers</h3>
								<span className="text-xs text-[var(--color-ink-400)]">Traffic sources</span>
							</div>

							{initialSummary.topReferrers.length === 0 ? (
								<p className="py-8 text-center text-xs text-[var(--color-ink-400)]">No referrer data recorded yet.</p>
							) : (
								<div className="space-y-3 pt-1 text-xs">
									{initialSummary.topReferrers.map((ref, idx) => (
										<div key={idx} className="space-y-1">
											<div className="flex justify-between font-medium">
												<span className="text-[var(--color-ink-800)]">{ref.referrer}</span>
												<span className="text-[var(--color-ink-500)]">{ref.count} visits ({ref.percentage}%)</span>
											</div>
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
												<div
													className="h-full rounded-full bg-[var(--color-accent-500)]"
													style={{ width: `${ref.percentage}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Bottom Grid: Devices & Browsers */}
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{/* Device Distribution */}
						<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
							<h3 className="mb-3 text-sm font-bold text-[var(--color-ink-900)]">Device Share</h3>
							<div className="grid grid-cols-3 gap-3">
								{initialSummary.devices.map((d) => (
									<div key={d.device} className="flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--color-ink-100)] p-3 text-center">
										{d.device === "mobile" ? <Smartphone size={20} className="text-indigo-500 mb-1" /> : d.device === "tablet" ? <Tablet size={20} className="text-purple-500 mb-1" /> : <Monitor size={20} className="text-blue-500 mb-1" />}
										<span className="capitalize font-semibold text-xs text-[var(--color-ink-800)]">{d.device}</span>
										<span className="text-sm font-extrabold text-[var(--color-ink-900)] mt-0.5">{d.percentage}%</span>
										<span className="text-[10px] text-[var(--color-ink-400)]">{d.count} hits</span>
									</div>
								))}
							</div>
						</div>

						{/* Browser Distribution */}
						<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
							<h3 className="mb-3 text-sm font-bold text-[var(--color-ink-900)]">Browser Distribution</h3>
							<div className="space-y-2 pt-1 text-xs">
								{initialSummary.browsers.map((b) => (
									<div key={b.browser} className="flex items-center justify-between py-1 border-b border-[var(--color-ink-50)] last:border-none">
										<span className="font-medium text-[var(--color-ink-800)]">{b.browser}</span>
										<span className="font-semibold text-[var(--color-ink-900)]">{b.percentage}% ({b.count} visits)</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* TAB 2: Speed Insights (Core Web Vitals) */}
			{activeTab === "speed" && (
				<div className="flex flex-col gap-4">
					{/* Overall Score Header Banner */}
					<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-[var(--radius-lg)] border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 sm:p-6 dark:border-emerald-900/40 dark:from-emerald-950/20 dark:to-teal-950/20">
						<div>
							<div className="flex items-center gap-2">
								<span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
									Vercel Speed Insights Alternative
								</span>
							</div>
							<h2 className="mt-1 text-lg font-bold text-[var(--color-ink-900)]">Real User Store Performance (RUM)</h2>
							<p className="mt-0.5 max-w-xl text-xs text-[var(--color-ink-600)]">
								Calculated from real browser visits using Google&apos;s Core Web Vitals 75th percentile standard.
							</p>
						</div>

						<div className="mt-3 sm:mt-0 flex items-center gap-3">
							<div className="text-right">
								<span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">{initialSpeed.overallScore}</span>
								<span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">/100</span>
								<p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
									{initialSpeed.overallScore >= 90 ? "Excellent Experience" : initialSpeed.overallScore >= 70 ? "Good Performance" : "Needs Optimization"}
								</p>
							</div>
						</div>
					</div>

					{/* 5 Web Vitals Cards Grid */}
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
						<VitalCard summary={initialSpeed.metrics.LCP} title="Largest Contentful Paint" description="Main content render time (<= 2.5s is Good)" />
						<VitalCard summary={initialSpeed.metrics.CLS} title="Cumulative Layout Shift" description="Visual stability (<= 0.1 is Good)" />
						<VitalCard summary={initialSpeed.metrics.INP} title="Interaction to Next Paint" description="Click / tap responsiveness (<= 200ms is Good)" />
						<VitalCard summary={initialSpeed.metrics.TTFB} title="Time to First Byte" description="Server response time (<= 800ms is Good)" />
						<VitalCard summary={initialSpeed.metrics.FCP} title="First Contentful Paint" description="First visual element painted (<= 1.8s is Good)" />
					</div>

					{/* Slowest Pages Breakdown */}
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
						<h3 className="mb-2 text-sm font-bold text-[var(--color-ink-900)]">Page-Level Speed Breakdown</h3>
						<p className="mb-3 text-xs text-[var(--color-ink-500)]">
							Identifies storefront paths with render delays or layout shifts to help prioritize optimizations.
						</p>

						{initialSpeed.slowestPages.length === 0 ? (
							<p className="py-6 text-center text-xs text-[var(--color-ink-400)]">No page vitals samples captured yet.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="border-b border-[var(--color-ink-100)] text-[var(--color-ink-400)] uppercase text-[10px] tracking-wider">
											<th className="pb-2">Page URL Path</th>
											<th className="pb-2">Avg LCP</th>
											<th className="pb-2">Avg CLS</th>
											<th className="pb-2">Samples</th>
											<th className="pb-2 text-right">Status</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--color-ink-50)]">
										{initialSpeed.slowestPages.map((p, idx) => (
											<tr key={idx} className="py-2.5">
												<td className="py-2.5 font-mono text-[11px] font-medium text-[var(--color-ink-800)]">{p.path}</td>
												<td className="py-2.5 font-semibold">{p.avgLcp} ms</td>
												<td className="py-2.5 font-semibold">{p.avgCls}</td>
												<td className="py-2.5 text-[var(--color-ink-500)]">{p.samples} visits</td>
												<td className="py-2.5 text-right">
													<span className={classNames(
														"rounded-full px-2 py-0.5 text-[10px] font-bold",
														p.avgLcp <= 2500 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
													)}>
														{p.avgLcp <= 2500 ? "Fast" : "Needs Review"}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>
				</div>
			)}

			{/* TAB 3: Conversion Funnel */}
			{activeTab === "funnel" && (
				<div className="flex flex-col gap-4">
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 sm:p-6 shadow-sm">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 pb-4 border-b border-[var(--color-ink-100)]">
							<div>
								<h3 className="text-base font-bold text-[var(--color-ink-900)]">Storefront E-Commerce Funnel</h3>
								<p className="text-xs text-[var(--color-ink-500)] mt-0.5">
									Tracks progression from initial storefront visit through to confirmed purchase.
								</p>
							</div>
							<div className="mt-2 sm:mt-0 rounded-[var(--radius-md)] bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-right">
								<span className="text-[11px] font-semibold text-emerald-800">Overall Store Conversion</span>
								<p className="text-lg font-extrabold text-emerald-700">{initialFunnel.overallConversionRate}%</p>
							</div>
						</div>

						{/* Funnel Steps */}
						<div className="space-y-4">
							{initialFunnel.stages.map((stage, idx) => (
								<div key={idx} className="space-y-1.5">
									<div className="flex items-center justify-between text-xs font-semibold">
										<span className="text-[var(--color-ink-900)]">{stage.name}</span>
										<div className="flex items-center gap-3">
											<span className="text-[var(--color-ink-900)] font-bold">{stage.count.toLocaleString()}</span>
											<span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">
												{stage.conversionRate}% conversion
											</span>
										</div>
									</div>
									<div className="h-3 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
										<div
											className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
											style={{ width: `${Math.max(stage.conversionRate, 2)}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function KpiCard({
	title,
	value,
	change,
	subtext,
	icon: Icon,
}: {
	title: string;
	value: string;
	change?: number;
	subtext?: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
	return (
		<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
			<div className="flex items-center justify-between">
				<span className="text-xs font-medium text-[var(--color-ink-500)]">{title}</span>
				<span className="grid size-7 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-ink-50)] text-[var(--color-ink-600)]">
					<Icon size={14} />
				</span>
			</div>
			<div className="mt-2 flex items-baseline gap-2">
				<span className="text-xl font-extrabold tracking-tight text-[var(--color-ink-900)]">{value}</span>
				{change !== undefined && (
					<span
						className={classNames(
							"flex items-center text-[10px] font-bold",
							change >= 0 ? "text-emerald-600" : "text-rose-600",
						)}
					>
						{change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
						{Math.abs(change)}%
					</span>
				)}
			</div>
			{subtext && <p className="mt-0.5 text-[11px] text-[var(--color-ink-400)]">{subtext}</p>}
		</div>
	);
}

function VitalCard({
	summary,
	title,
	description,
}: {
	summary: WebVitalMetricSummary;
	title: string;
	description: string;
}) {
	const isGood = summary.rating === "good";
	const isWarn = summary.rating === "needs-improvement";

	return (
		<div className="flex flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-ink-100)] bg-[var(--color-surface)] p-4 shadow-sm">
			<div>
				<div className="flex items-center justify-between">
					<span className="font-bold text-sm text-[var(--color-ink-900)]">{summary.metric}</span>
					<span
						className={classNames(
							"rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
							isGood ? "bg-emerald-100 text-emerald-800" : isWarn ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800",
						)}
					>
						{summary.rating}
					</span>
				</div>
				<p className="text-[11px] text-[var(--color-ink-500)] mt-0.5">{title}</p>
				<div className="mt-3 flex items-baseline gap-1">
					<span className="text-2xl font-extrabold text-[var(--color-ink-900)]">
						{summary.metric === "CLS" ? summary.p75.toFixed(2) : summary.p75 >= 1000 ? (summary.p75 / 1000).toFixed(2) : summary.p75}
					</span>
					<span className="text-xs font-semibold text-[var(--color-ink-400)]">
						{summary.metric === "CLS" ? "" : summary.p75 >= 1000 ? "s" : "ms"} (p75)
					</span>
				</div>
			</div>

			<div className="mt-3 pt-2 border-t border-[var(--color-ink-50)] text-[10px] text-[var(--color-ink-400)]">
				{description}
			</div>
		</div>
	);
}
