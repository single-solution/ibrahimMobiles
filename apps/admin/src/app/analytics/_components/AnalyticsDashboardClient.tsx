"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
	AlertTriangle,
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	Clock,
	Compass,
	Cpu,
	ExternalLink,
	Eye,
	Filter,
	Flame,
	Gauge,
	Globe,
	Info,
	Laptop,
	Layers,
	MapPin,
	Maximize2,
	Monitor,
	MousePointerClick,
	Radio,
	Search,
	Share2,
	ShieldAlert,
	ShoppingBag,
	Smartphone,
	Sparkles,
	Tablet,
	Timer,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import type {
	AnalyticsEventItem,
	AnalyticsPeriod,
	AnalyticsSummary,
	FunnelSummary,
	SpeedInsightsSummary,
	WebVitalMetricSummary,
} from "@/lib/server/analyticsData";
import { classNames } from "@store/shared";
import { Modal } from "@/components/ui/Modal";
import { StatusPill, type StatusTone } from "@/components/shared/StatusPill";

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

export function AnalyticsDashboardClient({
	initialSummary,
	initialSpeed,
	initialFunnel,
	period,
}: AnalyticsDashboardClientProps) {
	const router = useRouter();

	// Modal States
	const [isPagesModalOpen, setIsPagesModalOpen] = useState(false);
	const [isReferrersModalOpen, setIsReferrersModalOpen] = useState(false);
	const [isCitiesModalOpen, setIsCitiesModalOpen] = useState(false);
	const [isSearchesModalOpen, setIsSearchesModalOpen] = useState(false);
	const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);
	const [selectedMetric, setSelectedMetric] = useState<WebVitalMetricSummary | null>(null);
	const [selectedSession, setSelectedSession] = useState<AnalyticsEventItem | null>(null);
	const [pageSearchQuery, setPageSearchQuery] = useState("");

	function handlePeriodChange(newPeriod: AnalyticsPeriod) {
		router.push(`/analytics?period=${newPeriod}`);
	}

	const filteredPages = initialSummary.topPages.filter(
		(p) => p.path.toLowerCase().includes(pageSearchQuery.toLowerCase()) || p.title.toLowerCase().includes(pageSearchQuery.toLowerCase()),
	);

	// Multi-step session journey for selected session
	const sessionEvents = selectedSession
		? initialSummary.recentEvents.filter((e) => e.sessionId === selectedSession.sessionId)
		: [];

	return (
		<div className="flex flex-1 flex-col gap-5 overflow-y-auto p-3 md:p-5">
			{/* ═══════════════════════════════════════════════════
			    HEADER & CONTROLS
			    ═══════════════════════════════════════════════════ */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-700)]">
						Storefront Telemetry
					</p>
					<h1 className="mt-0.5 text-[20px] font-semibold leading-tight tracking-tight text-[var(--color-ink-900)]">
						Analytics & Speed Insights
					</h1>
					<p className="mt-0.5 text-[12px] text-[var(--color-ink-500)]">
						Live shopper sessions, conversion funnel, search intent, and real-device Core Web Vitals.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					{/* Live Online Badge */}
					<div className="flex items-center gap-1.5 rounded-[var(--radius-full)] border border-emerald-200 bg-emerald-50/90 px-3 py-1 text-[11.5px] font-semibold text-emerald-800 shadow-xs">
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
						</span>
						<span>{initialSummary.liveVisitors} Online Now</span>
					</div>

					{/* Period Selector Tabs */}
					<div className="flex rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-0.5 shadow-xs">
						{PERIOD_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type="button"
								onClick={() => handlePeriodChange(opt.value)}
								className={classNames(
									"rounded-[var(--radius-sm)] px-2.5 py-1 text-[11.5px] font-semibold transition-all",
									period === opt.value
										? "bg-[var(--color-accent-100)] text-[var(--color-accent-900)] shadow-xs"
										: "text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════
			    ROW 1: TOP KPI CARDS (6-CARD BENTO GRID)
			    ═══════════════════════════════════════════════════ */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
				<AnalyticsKpiCard
					label="Total Pageviews"
					value={initialSummary.totalPageViews.toLocaleString()}
					changePercent={initialSummary.pageViewsChange}
					icon={<Eye size={15} />}
				/>
				<AnalyticsKpiCard
					label="Unique Visitors"
					value={initialSummary.uniqueVisitors.toLocaleString()}
					changePercent={initialSummary.uniqueVisitorsChange}
					icon={<Users size={15} />}
				/>
				<AnalyticsKpiCard
					label="Active Sessions"
					value={initialSummary.totalSessions.toLocaleString()}
					subtext="Visits with interaction"
					icon={<Compass size={15} />}
				/>
				<AnalyticsKpiCard
					label="Avg Session Dwell"
					value={`${Math.floor(initialSummary.avgDurationSeconds / 60)}m ${initialSummary.avgDurationSeconds % 60}s`}
					subtext="Time spent on store"
					icon={<Clock size={15} />}
				/>
				<AnalyticsKpiCard
					label="Bounce Rate"
					value={`${initialSummary.bounceRate}%`}
					subtext="Single-page exits"
					icon={<MousePointerClick size={15} />}
				/>
				<AnalyticsKpiCard
					label="Store Speed Score"
					value={`${initialSpeed.overallScore}/100`}
					tone="accent"
					subtext={initialSpeed.overallScore >= 85 ? "Fast Experience" : "Optimization Recommended"}
					icon={<Gauge size={15} />}
				/>
			</div>

			{/* ═══════════════════════════════════════════════════
			    ROW 2: SPEED INSIGHTS (CORE WEB VITALS)
			    ═══════════════════════════════════════════════════ */}
			<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
				<div className="flex flex-col gap-2 border-b border-[var(--color-ink-100)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
								<Gauge size={14} strokeWidth={2.4} />
							</span>
							<h2 className="text-sm font-semibold text-[var(--color-ink-900)]">Real User Speed Insights (Core Web Vitals)</h2>
						</div>
						<p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">
							Field measurements captured directly from shoppers&apos; devices using Google&apos;s p75 standard.
						</p>
					</div>

					<button
						type="button"
						onClick={() => setIsVitalsModalOpen(true)}
						className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-canvas)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--color-ink-700)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink-900)]"
					>
						<Sparkles size={13} className="text-[var(--color-accent-700)]" />
						Inspect Diagnostics & Fixes
					</button>
				</div>

				<div className="grid grid-cols-1 divide-y divide-[var(--color-ink-100)] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-5">
					<VitalItemCard
						metric="LCP"
						name="Largest Contentful Paint"
						summary={initialSpeed.metrics.LCP}
						onInspect={() => {
							setSelectedMetric(initialSpeed.metrics.LCP);
							setIsVitalsModalOpen(true);
						}}
					/>
					<VitalItemCard
						metric="CLS"
						name="Cumulative Layout Shift"
						summary={initialSpeed.metrics.CLS}
						onInspect={() => {
							setSelectedMetric(initialSpeed.metrics.CLS);
							setIsVitalsModalOpen(true);
						}}
					/>
					<VitalItemCard
						metric="INP"
						name="Interaction to Next Paint"
						summary={initialSpeed.metrics.INP}
						onInspect={() => {
							setSelectedMetric(initialSpeed.metrics.INP);
							setIsVitalsModalOpen(true);
						}}
					/>
					<VitalItemCard
						metric="TTFB"
						name="Time to First Byte"
						summary={initialSpeed.metrics.TTFB}
						onInspect={() => {
							setSelectedMetric(initialSpeed.metrics.TTFB);
							setIsVitalsModalOpen(true);
						}}
					/>
					<VitalItemCard
						metric="FCP"
						name="First Contentful Paint"
						summary={initialSpeed.metrics.FCP}
						onInspect={() => {
							setSelectedMetric(initialSpeed.metrics.FCP);
							setIsVitalsModalOpen(true);
						}}
					/>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════
			    ROW 3: SEARCH INTENT & PRODUCT MERCHANDISING
			    ═══════════════════════════════════════════════════ */}
			<div className="grid items-start gap-4 lg:grid-cols-2">
				{/* Search Queries Intelligence */}
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
					<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] pb-3">
						<div>
							<div className="flex items-center gap-2">
								<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
									<Search size={13} strokeWidth={2.4} />
								</span>
								<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Shopper Search Queries</h3>
							</div>
							<p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">
								Customer product demand & zero-result search opportunities.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setIsSearchesModalOpen(true)}
							className="text-[11.5px] font-semibold text-[var(--color-accent-800)] hover:underline"
						>
							View All
						</button>
					</div>

					<div className="mt-3 divide-y divide-[var(--color-ink-50)] text-xs">
						{initialSummary.topSearches.slice(0, 5).map((s, idx) => (
							<div key={idx} className="flex items-center justify-between py-2">
								<div className="flex items-center gap-2 min-w-0 pr-2">
									<span className="font-semibold text-[var(--color-ink-900)] truncate capitalize">&ldquo;{s.query}&rdquo;</span>
									{!s.hasResults && (
										<span className="rounded bg-amber-50 border border-amber-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
											0 In Stock
										</span>
									)}
								</div>
								<div className="text-right shrink-0">
									<span className="font-bold text-[var(--color-ink-900)] tabular-nums">{s.count} searches</span>
									<p className="text-[10.5px] text-[var(--color-ink-400)]">{s.lastSearched}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Product Merchandising & Conversion Matrix */}
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
					<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] pb-3">
						<div>
							<div className="flex items-center gap-2">
								<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
									<Flame size={13} strokeWidth={2.4} />
								</span>
								<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Product Performance Matrix</h3>
							</div>
							<p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">
								Views vs. purchase conversion efficiency across catalog.
							</p>
						</div>
					</div>

					<div className="mt-3 divide-y divide-[var(--color-ink-50)] text-xs">
						{initialSummary.productMerch.map((p, idx) => (
							<div key={idx} className="flex items-center justify-between py-2">
								<div className="min-w-0 pr-3">
									<p className="font-semibold text-[var(--color-ink-900)] truncate">{p.title}</p>
									<p className="text-[11px] text-[var(--color-ink-500)]">{p.views} views · {p.orders} orders</p>
								</div>
								<div className="text-right shrink-0">
									<span className={classNames(
										"rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums",
										p.status === "hot" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
									)}>
										{p.conversionRate}% conv
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════
			    ROW 4: 12-COLUMN MAIN BENTO GRID (PAGES, CHANNELS, CITIES)
			    ═══════════════════════════════════════════════════ */}
			<div className="grid items-start gap-4 xl:grid-cols-12">
				{/* LEFT COLUMN: Top Pages & Funnel (8 Cols) */}
				<div className="min-w-0 flex-1 space-y-4 xl:col-span-8">
					{/* Top Pages Table */}
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
						<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] px-4 py-3">
							<div>
								<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Top Storefront Pages & Landing Paths</h3>
								<p className="text-[11px] text-[var(--color-ink-500)]">Ranked by total pageviews and engagement duration.</p>
							</div>
							<button
								type="button"
								onClick={() => setIsPagesModalOpen(true)}
								className="text-[11.5px] font-semibold text-[var(--color-accent-800)] hover:underline"
							>
								View all ({initialSummary.topPages.length})
							</button>
						</div>

						{initialSummary.topPages.length === 0 ? (
							<p className="py-8 text-center text-xs text-[var(--color-ink-400)]">No pageview data recorded yet.</p>
						) : (
							<div className="overflow-x-auto">
								<table className="w-full text-left text-xs">
									<thead>
										<tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
											<th className="px-4 py-2">Page Path</th>
											<th className="px-3 py-2 text-right">Views</th>
											<th className="px-3 py-2 text-right">Avg Dwell</th>
											<th className="px-4 py-2 text-right">Bounce Rate</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--color-ink-100)]">
										{initialSummary.topPages.slice(0, 6).map((page, idx) => (
											<tr key={idx} className="transition-colors hover:bg-[var(--color-surface-muted)]/50">
												<td className="px-4 py-2.5">
													<p className="font-semibold text-[var(--color-ink-900)] truncate max-w-[280px] sm:max-w-md">{page.title || page.path}</p>
													<p className="font-mono text-[11px] text-[var(--color-ink-500)] truncate">{page.path}</p>
												</td>
												<td className="px-3 py-2.5 text-right font-bold tabular-nums text-[var(--color-ink-900)]">
													{page.views.toLocaleString()}
												</td>
												<td className="px-3 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">
													{page.avgDuration}s
												</td>
												<td className="px-4 py-2.5 text-right tabular-nums text-[var(--color-ink-600)]">
													{page.bounceRate}%
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Conversion Funnel */}
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
						<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] pb-3">
							<div>
								<div className="flex items-center gap-2">
									<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
										<Layers size={13} strokeWidth={2.4} />
									</span>
									<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">E-Commerce Conversion Progression</h3>
								</div>
								<p className="mt-0.5 text-[11.5px] text-[var(--color-ink-500)]">
									Visualizing shopper drop-off across the buying journey.
								</p>
							</div>

							<div className="text-right">
								<span className="text-[11px] font-medium text-[var(--color-ink-500)]">Store Conversion</span>
								<p className="text-base font-bold text-[var(--color-accent-800)]">{initialFunnel.overallConversionRate}%</p>
							</div>
						</div>

						<div className="mt-4 space-y-3.5">
							{initialFunnel.stages.map((stage, idx) => (
								<div key={idx} className="space-y-1">
									<div className="flex items-center justify-between text-xs">
										<span className="font-semibold text-[var(--color-ink-900)]">{stage.name}</span>
										<div className="flex items-center gap-2">
											<span className="font-bold tabular-nums text-[var(--color-ink-900)]">{stage.count.toLocaleString()}</span>
											<span className="rounded bg-[var(--color-accent-100)] px-1.5 py-0.5 text-[10.5px] font-bold text-[var(--color-accent-900)]">
												{stage.conversionRate}%
											</span>
										</div>
									</div>
									<div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
										<div
											className="h-full rounded-full bg-[var(--color-accent-500)] transition-all duration-300"
											style={{ width: `${Math.max(stage.conversionRate, 3)}%` }}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: Channels, Pakistan Cities & Tech (4 Cols) */}
				<div className="min-w-0 flex-1 space-y-4 xl:col-span-4">
					{/* Traffic Channels */}
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
						<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] pb-3">
							<div>
								<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Acquisition Channels</h3>
								<p className="text-[11px] text-[var(--color-ink-500)]">Where shoppers originate from.</p>
							</div>
							<button
								type="button"
								onClick={() => setIsReferrersModalOpen(true)}
								className="text-[11.5px] font-semibold text-[var(--color-accent-800)] hover:underline"
							>
								Details
							</button>
						</div>

						{initialSummary.topReferrers.length === 0 ? (
							<p className="py-6 text-center text-xs text-[var(--color-ink-400)]">No referrer data recorded yet.</p>
						) : (
							<div className="mt-3 space-y-3">
								{initialSummary.topReferrers.slice(0, 5).map((ref, idx) => (
									<div key={idx} className="space-y-1">
										<div className="flex justify-between text-xs">
											<span className="font-medium text-[var(--color-ink-800)] truncate max-w-[180px]">{ref.referrer}</span>
											<span className="font-semibold text-[var(--color-ink-900)] tabular-nums">{ref.count} ({ref.percentage}%)</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
											<div
												className="h-full rounded-full bg-[var(--color-ink-700)]"
												style={{ width: `${ref.percentage}%` }}
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Pakistan Cities Breakdown */}
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
						<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] pb-3">
							<div className="flex items-center gap-2">
								<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-accent-100)] text-[var(--color-accent-800)]">
									<MapPin size={13} strokeWidth={2.4} />
								</span>
								<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Pakistan City Breakdown</h3>
							</div>
						</div>

						<div className="mt-3 space-y-2.5 text-xs">
							{initialSummary.cities.slice(0, 5).map((city, idx) => (
								<div key={idx} className="flex items-center justify-between">
									<span className="font-medium text-[var(--color-ink-800)]">{city.city}</span>
									<span className="font-bold text-[var(--color-ink-900)] tabular-nums">{city.percentage}% ({city.count})</span>
								</div>
							))}
						</div>
					</div>

					{/* Device & Browser Grid */}
					<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
						<h3 className="border-b border-[var(--color-ink-100)] pb-2.5 text-sm font-semibold text-[var(--color-ink-900)]">
							Devices & Platforms
						</h3>

						<div className="mt-3 grid grid-cols-3 gap-2 text-center">
							{initialSummary.devices.map((d) => (
								<div key={d.device} className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] p-2">
									<div className="flex justify-center mb-1 text-[var(--color-ink-700)]">
										{d.device === "mobile" ? <Smartphone size={16} /> : d.device === "tablet" ? <Tablet size={16} /> : <Monitor size={16} />}
									</div>
									<p className="text-[10px] font-semibold uppercase text-[var(--color-ink-500)]">{d.device}</p>
									<p className="text-xs font-bold text-[var(--color-ink-900)]">{d.percentage}%</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════
			    ROW 5: REAL-TIME ACTIVITY STREAM & 404 BROKEN LINKS
			    ═══════════════════════════════════════════════════ */}
			<div className="grid items-start gap-4 lg:grid-cols-3">
				{/* Live Activity Stream (2 cols) */}
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] lg:col-span-2">
					<div className="flex items-center justify-between border-b border-[var(--color-ink-100)] px-4 py-3">
						<div>
							<div className="flex items-center gap-2">
								<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-emerald-100 text-emerald-800">
									<Radio size={13} strokeWidth={2.4} />
								</span>
								<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Live Shopper Interaction Stream</h3>
							</div>
							<p className="text-[11px] text-[var(--color-ink-500)]">Click any session row to inspect the visitor&apos;s full journey timeline.</p>
						</div>
						<span className="text-xs text-[var(--color-ink-400)]">Live Feed</span>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full text-left text-xs">
							<thead>
								<tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-500)]">
									<th className="px-4 py-2">Time</th>
									<th className="px-3 py-2">Event</th>
									<th className="px-3 py-2">Target Path</th>
									<th className="px-3 py-2">City & Device</th>
									<th className="px-4 py-2 text-right">Inspect</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-ink-100)]">
								{initialSummary.recentEvents.slice(0, 8).map((evt) => (
									<tr
										key={evt.id}
										onClick={() => setSelectedSession(evt)}
										className="cursor-pointer transition-colors hover:bg-[var(--color-surface-muted)]/60"
									>
										<td className="px-4 py-2 text-[11px] text-[var(--color-ink-500)] tabular-nums">
											{evt.timeAgo}
										</td>
										<td className="px-3 py-2">
											<StatusPill tone={evt.eventType === "page_view" ? "info" : evt.eventType === "web_vital" ? "accent" : evt.eventType === "error_404" ? "danger" : "neutral"}>
												{evt.eventType === "page_view" ? "Pageview" : evt.eventType === "web_vital" ? `${evt.vitalMetric}` : evt.eventType === "error_404" ? "404 Error" : evt.eventType}
											</StatusPill>
										</td>
										<td className="px-3 py-2">
											<span className="font-mono text-[11px] text-[var(--color-ink-800)] truncate block max-w-[200px] sm:max-w-xs">{evt.path}</span>
										</td>
										<td className="px-3 py-2 text-[11px] text-[var(--color-ink-600)]">
											{evt.city || "Karachi"} · {evt.device}
										</td>
										<td className="px-4 py-2 text-right text-[var(--color-accent-800)] font-semibold">
											→
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{/* Broken Links & 404 Telemetry (1 col) */}
				<div className="rounded-[var(--radius-lg)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)]">
					<div className="flex items-center gap-2 border-b border-[var(--color-ink-100)] pb-3">
						<span className="grid size-6 place-items-center rounded-[var(--radius-sm)] bg-rose-100 text-rose-800">
							<AlertTriangle size={13} strokeWidth={2.4} />
						</span>
						<div>
							<h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Broken Links (404s)</h3>
							<p className="text-[11px] text-[var(--color-ink-500)]">URLs that returned 404 error pages.</p>
						</div>
					</div>

					<div className="mt-3 divide-y divide-[var(--color-ink-50)] text-xs">
						{initialSummary.brokenLinks.map((b, idx) => (
							<div key={idx} className="py-2">
								<p className="font-mono font-semibold text-rose-700 truncate">{b.path}</p>
								<div className="flex justify-between text-[11px] text-[var(--color-ink-500)] mt-0.5">
									<span>Ref: {b.referrer}</span>
									<span className="font-bold text-[var(--color-ink-800)]">{b.hits} hits ({b.lastSeen})</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════
			    MODAL 1: FULL PAGES CATALOG MODAL
			    ═══════════════════════════════════════════════════ */}
			<Modal
				isOpen={isPagesModalOpen}
				onClose={() => setIsPagesModalOpen(false)}
				title="All Storefront Landing Pages"
				maxWidth="3xl"
			>
				<div className="space-y-3">
					<div className="relative">
						<Search size={14} className="absolute left-3 top-2.5 text-[var(--color-ink-400)]" />
						<input
							type="text"
							placeholder="Search by path or title..."
							value={pageSearchQuery}
							onChange={(e) => setPageSearchQuery(e.target.value)}
							className="w-full rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--color-ink-900)] outline-hidden focus:border-[var(--color-accent-500)]"
						/>
					</div>

					<div className="max-h-[60vh] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-ink-100)]">
						<table className="w-full text-left text-xs">
							<thead>
								<tr className="border-b border-[var(--color-ink-100)] bg-[var(--color-surface-muted)] text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-500)] sticky top-0">
									<th className="px-3 py-2">Page Title & Path</th>
									<th className="px-3 py-2 text-right">Views</th>
									<th className="px-3 py-2 text-right">Avg Duration</th>
									<th className="px-3 py-2 text-right">Bounce Rate</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--color-ink-100)]">
								{filteredPages.map((page, idx) => (
									<tr key={idx} className="hover:bg-[var(--color-surface-muted)]/50">
										<td className="px-3 py-2">
											<p className="font-semibold text-[var(--color-ink-900)]">{page.title || page.path}</p>
											<p className="font-mono text-[11px] text-[var(--color-ink-500)]">{page.path}</p>
										</td>
										<td className="px-3 py-2 text-right font-bold tabular-nums">{page.views.toLocaleString()}</td>
										<td className="px-3 py-2 text-right tabular-nums">{page.avgDuration}s</td>
										<td className="px-3 py-2 text-right tabular-nums">{page.bounceRate}%</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</Modal>

			{/* ═══════════════════════════════════════════════════
			    MODAL 2: SEARCH QUERIES DEEP DIVE MODAL
			    ═══════════════════════════════════════════════════ */}
			<Modal
				isOpen={isSearchesModalOpen}
				onClose={() => setIsSearchesModalOpen(false)}
				title="All Customer Search Queries"
				maxWidth="lg"
			>
				<div className="space-y-3 max-h-[60vh] overflow-y-auto">
					{initialSummary.topSearches.map((s, idx) => (
						<div key={idx} className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] p-3 flex items-center justify-between">
							<div>
								<p className="font-semibold text-sm text-[var(--color-ink-900)] capitalize">&ldquo;{s.query}&rdquo;</p>
								<p className="text-[11px] text-[var(--color-ink-500)]">Last searched {s.lastSearched}</p>
							</div>
							<div className="text-right">
								<span className="font-bold text-sm text-[var(--color-ink-900)] tabular-nums">{s.count} times</span>
								<p className="text-[10.5px]">
									{s.hasResults ? <span className="text-emerald-700 font-semibold">In Catalog</span> : <span className="text-amber-700 font-semibold">0 In Stock</span>}
								</p>
							</div>
						</div>
					))}
				</div>
			</Modal>

			{/* ═══════════════════════════════════════════════════
			    MODAL 3: FULL REFERRERS & CHANNELS MODAL
			    ═══════════════════════════════════════════════════ */}
			<Modal
				isOpen={isReferrersModalOpen}
				onClose={() => setIsReferrersModalOpen(false)}
				title="Acquisition Channels & Traffic Sources"
				maxWidth="lg"
			>
				<div className="space-y-3 max-h-[60vh] overflow-y-auto">
					{initialSummary.topReferrers.map((ref, idx) => (
						<div key={idx} className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] p-3 space-y-1.5">
							<div className="flex justify-between text-xs font-semibold">
								<span className="text-[var(--color-ink-900)]">{ref.referrer}</span>
								<span className="text-[var(--color-accent-800)]">{ref.count} hits ({ref.percentage}%)</span>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
								<div className="h-full rounded-full bg-[var(--color-accent-500)]" style={{ width: `${ref.percentage}%` }} />
							</div>
						</div>
					))}
				</div>
			</Modal>

			{/* ═══════════════════════════════════════════════════
			    MODAL 4: CORE WEB VITALS DIAGNOSTICS MODAL
			    ═══════════════════════════════════════════════════ */}
			<Modal
				isOpen={isVitalsModalOpen}
				onClose={() => {
					setIsVitalsModalOpen(false);
					setSelectedMetric(null);
				}}
				title="Core Web Vitals Speed Diagnostics"
				maxWidth="2xl"
			>
				<div className="space-y-4">
					<div className="rounded-[var(--radius-md)] border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] p-3 text-xs text-[var(--color-accent-900)]">
						<p className="font-semibold">Google 75th Percentile Evaluation Standard</p>
						<p className="mt-0.5 text-[11.5px] opacity-90">
							Google determines search rankings and speed insights based on 75% of real-world shopper visits.
						</p>
					</div>

					<div className="space-y-3">
						{Object.values(initialSpeed.metrics).map((m) => (
							<div key={m.metric} className="rounded-[var(--radius-md)] border border-[var(--color-ink-100)] p-3 space-y-2">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="font-bold text-sm text-[var(--color-ink-900)]">{m.metric}</span>
										<span className="text-xs text-[var(--color-ink-500)]">
											p75: <strong className="text-[var(--color-ink-900)]">{m.metric === "CLS" ? m.p75.toFixed(2) : m.p75 >= 1000 ? (m.p75 / 1000).toFixed(2) + "s" : m.p75 + "ms"}</strong>
										</span>
									</div>
									<StatusPill tone={m.rating === "good" ? "success" : m.rating === "needs-improvement" ? "warn" : "danger"}>
										{m.rating}
									</StatusPill>
								</div>

								<p className="text-xs text-[var(--color-ink-600)]">{m.description}</p>

								{/* Distribution Bar */}
								<div className="space-y-1">
									<div className="flex justify-between text-[10.5px] text-[var(--color-ink-500)]">
										<span>Good ({m.goodPercent}%)</span>
										<span>Needs Improvement ({m.needsImprovementPercent}%)</span>
										<span>Poor ({m.poorPercent}%)</span>
									</div>
									<div className="flex h-2 w-full overflow-hidden rounded-full bg-[var(--color-ink-100)]">
										<div className="bg-emerald-500 h-full" style={{ width: `${m.goodPercent}%` }} />
										<div className="bg-amber-500 h-full" style={{ width: `${m.needsImprovementPercent}%` }} />
										<div className="bg-rose-500 h-full" style={{ width: `${m.poorPercent}%` }} />
									</div>
								</div>

								<div className="rounded bg-[var(--color-surface-muted)] p-2 text-[11px] text-[var(--color-ink-700)]">
									💡 <strong>Recommended Action:</strong> {m.recommendation}
								</div>
							</div>
						))}
					</div>
				</div>
			</Modal>

			{/* ═══════════════════════════════════════════════════
			    MODAL 5: CUSTOMER JOURNEY & SESSION TIMELINE INSPECTOR
			    ═══════════════════════════════════════════════════ */}
			<Modal
				isOpen={Boolean(selectedSession)}
				onClose={() => setSelectedSession(null)}
				title="Shopper Session Journey Timeline"
				maxWidth="lg"
			>
				{selectedSession && (
					<div className="space-y-4 text-xs">
						{/* Session Overview Box */}
						<div className="rounded-[var(--radius-md)] border border-[var(--color-ink-200)] bg-[var(--color-surface-muted)] p-3">
							<div className="grid grid-cols-2 gap-2">
								<div>
									<span className="text-[10px] text-[var(--color-ink-400)] uppercase font-semibold">Location</span>
									<p className="font-bold text-[var(--color-ink-900)] mt-0.5">{selectedSession.city || "Karachi"}, Pakistan</p>
								</div>
								<div>
									<span className="text-[10px] text-[var(--color-ink-400)] uppercase font-semibold">Device & Browser</span>
									<p className="font-bold text-[var(--color-ink-900)] mt-0.5 capitalize">{selectedSession.device} · {selectedSession.browser} ({selectedSession.os})</p>
								</div>
								<div>
									<span className="text-[10px] text-[var(--color-ink-400)] uppercase font-semibold">Referrer Source</span>
									<p className="font-bold text-[var(--color-ink-900)] mt-0.5 truncate">{selectedSession.referrer}</p>
								</div>
								<div>
									<span className="text-[10px] text-[var(--color-ink-400)] uppercase font-semibold">Session ID</span>
									<p className="font-mono text-[10.5px] text-[var(--color-ink-700)] mt-0.5 truncate">{selectedSession.sessionId}</p>
								</div>
							</div>
						</div>

						{/* Multi-Step Journey Timeline */}
						<div>
							<h4 className="font-semibold text-[var(--color-ink-900)] text-xs mb-3">Multi-Step Navigation Path</h4>
							<div className="relative pl-6 space-y-4 border-l-2 border-[var(--color-accent-300)] ml-2">
								{sessionEvents.length > 0 ? (
									sessionEvents.map((step, idx) => (
										<div key={idx} className="relative">
											<div className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-white bg-[var(--color-accent-600)]" />
											<p className="font-mono font-semibold text-[var(--color-ink-900)]">{step.path}</p>
											<p className="text-[11px] text-[var(--color-ink-500)]">{step.title} · {step.timeAgo}</p>
										</div>
									))
								) : (
									<div className="relative">
										<div className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-white bg-[var(--color-accent-600)]" />
										<p className="font-mono font-semibold text-[var(--color-ink-900)]">{selectedSession.path}</p>
										<p className="text-[11px] text-[var(--color-ink-500)]">{selectedSession.title} · {selectedSession.timeAgo}</p>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</Modal>
		</div>
	);
}

function AnalyticsKpiCard({
	label,
	value,
	changePercent,
	subtext,
	icon,
	tone = "default",
}: {
	label: string;
	value: string;
	changePercent?: number;
	subtext?: string;
	icon?: React.ReactNode;
	tone?: "default" | "accent";
}) {
	const isPositive = (changePercent ?? 0) >= 0;
	return (
		<div
			className={classNames(
				"group flex h-full flex-col justify-center rounded-[var(--radius-lg)] border p-3.5 sm:p-4 transition-all shadow-[var(--shadow-sm)]",
				tone === "accent"
					? "border-[var(--color-accent-200)] bg-[var(--color-accent-50)]"
					: "border-[var(--color-ink-200)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]/50",
			)}
		>
			<div className="flex items-center justify-between gap-1.5">
				<p className="text-[12px] font-medium text-[var(--color-ink-600)] truncate">{label}</p>
				{icon && <span className="text-[var(--color-ink-400)] group-hover:text-[var(--color-ink-600)]">{icon}</span>}
			</div>

			<div className="mt-2 flex items-baseline justify-between gap-1">
				<p className="text-[20px] font-semibold leading-none tracking-tight text-[var(--color-ink-900)] sm:text-[22px]">
					{value}
				</p>
				{typeof changePercent === "number" && (
					<p className={classNames("flex items-center text-[10.5px] font-semibold", isPositive ? "text-emerald-700" : "text-rose-600")}>
						{isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
						{Math.abs(changePercent)}%
					</p>
				)}
			</div>
			{subtext && <p className="mt-1 text-[10.5px] text-[var(--color-ink-400)] truncate">{subtext}</p>}
		</div>
	);
}

function VitalItemCard({
	metric,
	name,
	summary,
	onInspect,
}: {
	metric: string;
	name: string;
	summary: WebVitalMetricSummary;
	onInspect: () => void;
}) {
	const isGood = summary.rating === "good";
	const isWarn = summary.rating === "needs-improvement";

	return (
		<div
			onClick={onInspect}
			className="group flex flex-col justify-between p-3.5 sm:p-4 transition-colors hover:bg-[var(--color-surface-muted)]/50 cursor-pointer"
		>
			<div>
				<div className="flex items-center justify-between">
					<span className="font-bold text-sm text-[var(--color-ink-900)]">{metric}</span>
					<StatusPill tone={isGood ? "success" : isWarn ? "warn" : "danger"}>
						{summary.rating}
					</StatusPill>
				</div>
				<p className="text-[11px] text-[var(--color-ink-500)] mt-0.5 truncate" title={name}>{name}</p>

				<div className="mt-2.5 flex items-baseline gap-1">
					<span className="text-[20px] font-bold text-[var(--color-ink-900)]">
						{metric === "CLS" ? summary.p75.toFixed(2) : summary.p75 >= 1000 ? (summary.p75 / 1000).toFixed(2) : summary.p75}
					</span>
					<span className="text-[11px] font-semibold text-[var(--color-ink-400)]">
						{metric === "CLS" ? "" : summary.p75 >= 1000 ? "s" : "ms"} (p75)
					</span>
				</div>
			</div>

			<div className="mt-2.5 flex items-center justify-between border-t border-[var(--color-ink-100)] pt-2 text-[10.5px] text-[var(--color-ink-400)] group-hover:text-[var(--color-accent-800)]">
				<span>Target: {summary.targetThreshold.split("·")[0]}</span>
				<span>Inspect →</span>
			</div>
		</div>
	);
}
