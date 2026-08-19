import { Suspense } from "react";
import { requirePagePermission } from "@/lib/server/requirePageSession";
import { firstParam, type AdminPageSearchParams } from "@/lib/server/searchParams";
import { adminWorkspacePageClass } from "@/components/shared/workspaceUi";
import { AnalyticsDashboardClient } from "./_components/AnalyticsDashboardClient";
import {
	loadAnalyticsOverview,
	loadSpeedInsights,
	loadConversionFunnel,
	type AnalyticsPeriod,
} from "@/lib/server/analyticsData";

export const dynamic = "force-dynamic";

interface AdminAnalyticsPageProps {
	searchParams: Promise<AdminPageSearchParams>;
}

export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
	await requirePagePermission("analytics_view", "/analytics");
	const params = await searchParams;

	const rawPeriod = firstParam(params.period);
	const period: AnalyticsPeriod =
		rawPeriod === "24h" || rawPeriod === "7d" || rawPeriod === "30d" || rawPeriod === "90d" ? rawPeriod : "7d";

	return (
		<div className={adminWorkspacePageClass}>
			<section className="flex min-h-0 flex-1 flex-col">
				<Suspense fallback={<AnalyticsSkeleton />}>
					<AnalyticsDataLoader period={period} />
				</Suspense>
			</section>
		</div>
	);
}

async function AnalyticsDataLoader({ period }: { period: AnalyticsPeriod }) {
	const [summary, speed, funnel] = await Promise.all([
		loadAnalyticsOverview(period),
		loadSpeedInsights(period),
		loadConversionFunnel(period),
	]);

	return (
		<AnalyticsDashboardClient
			initialSummary={summary}
			initialSpeed={speed}
			initialFunnel={funnel}
			period={period}
		/>
	);
}

function AnalyticsSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-4 p-4 md:p-6 animate-pulse">
			<div className="flex items-center justify-between pb-2 border-b border-[var(--color-ink-100)]">
				<div className="h-8 w-64 rounded bg-[var(--color-ink-100)]" />
				<div className="h-8 w-48 rounded bg-[var(--color-ink-100)]" />
			</div>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<div className="h-24 rounded-[var(--radius-lg)] bg-[var(--color-ink-50)]" />
				<div className="h-24 rounded-[var(--radius-lg)] bg-[var(--color-ink-50)]" />
				<div className="h-24 rounded-[var(--radius-lg)] bg-[var(--color-ink-50)]" />
				<div className="h-24 rounded-[var(--radius-lg)] bg-[var(--color-ink-50)]" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<div className="h-64 rounded-[var(--radius-lg)] bg-[var(--color-ink-50)]" />
				<div className="h-64 rounded-[var(--radius-lg)] bg-[var(--color-ink-50)]" />
			</div>
		</div>
	);
}
