import { badRequest, ok } from "@store/shared";
import { connectDB, AnalyticsEvent, type DeviceType, type WebVitalMetric, type VitalRating } from "@store/db";
import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { PER_MINUTE_WINDOW_MS } from "@store/shared";

export const dynamic = "force-dynamic";

const TELEMETRY_PER_MINUTE = 120;

interface TelemetryPayload {
	eventType: "page_view" | "web_vital" | "custom";
	path: string;
	title?: string;
	referrer?: string;
	sessionId: string;
	visitorId?: string;
	vitalMetric?: WebVitalMetric;
	vitalValue?: number;
	vitalRating?: VitalRating;
	durationMs?: number;
	eventName?: string;
	eventData?: Record<string, unknown>;
}

function parseUserAgent(ua: string): { device: DeviceType; browser: string; os: string } {
	const lower = ua.toLowerCase();

	// Device
	let device: DeviceType = "desktop";
	if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lower)) {
		device = "tablet";
	} else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
		device = "mobile";
	}

	// Browser
	let browser = "other";
	if (lower.includes("edg/")) browser = "Edge";
	else if (lower.includes("chrome") && !lower.includes("chromium")) browser = "Chrome";
	else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
	else if (lower.includes("firefox")) browser = "Firefox";
	else if (lower.includes("opera") || lower.includes("opr/")) browser = "Opera";

	// OS
	let os = "other";
	if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ipod")) os = "iOS";
	else if (lower.includes("android")) os = "Android";
	else if (lower.includes("windows")) os = "Windows";
	else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
	else if (lower.includes("linux")) os = "Linux";

	return { device, browser, os };
}

export async function POST(request: Request) {
	const limited = enforcePublicRateLimit(request, {
		scope: "storefront-telemetry",
		max: TELEMETRY_PER_MINUTE,
		windowMs: PER_MINUTE_WINDOW_MS,
	});
	if (limited) {
		return limited;
	}

	let body: TelemetryPayload | { events: TelemetryPayload[] };
	try {
		body = (await request.json()) as TelemetryPayload | { events: TelemetryPayload[] };
	} catch {
		return badRequest("Invalid JSON body.");
	}

	const rawEvents = "events" in body && Array.isArray(body.events) ? body.events : [body as TelemetryPayload];
	if (rawEvents.length === 0) {
		return badRequest("No events provided.");
	}

	const ua = request.headers.get("user-agent") ?? "";
	const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? undefined;
	const { device, browser, os } = parseUserAgent(ua);

	await connectDB();

	const validEvents = rawEvents
		.filter((e) => e && typeof e.path === "string" && typeof e.sessionId === "string")
		.slice(0, 50) // clamp max batch
		.map((e) => ({
			eventType: e.eventType || "page_view",
			path: e.path.slice(0, 500),
			title: e.title?.slice(0, 300),
			referrer: e.referrer?.slice(0, 500),
			sessionId: e.sessionId.slice(0, 64),
			visitorId: e.visitorId?.slice(0, 64),
			device,
			browser,
			os,
			country,
			vitalMetric: e.vitalMetric,
			vitalValue: typeof e.vitalValue === "number" && Number.isFinite(e.vitalValue) ? e.vitalValue : undefined,
			vitalRating: e.vitalRating,
			durationMs: typeof e.durationMs === "number" && Number.isFinite(e.durationMs) ? Math.min(e.durationMs, 86400000) : 0,
			eventName: e.eventName?.slice(0, 64),
			eventData: e.eventData && typeof e.eventData === "object" ? e.eventData : undefined,
		}));

	if (validEvents.length > 0) {
		try {
			await AnalyticsEvent.insertMany(validEvents, { ordered: false });
		} catch {
			// Telemetry ingestion is resilient — best-effort
		}
	}

	return ok({ accepted: true, count: validEvents.length });
}
