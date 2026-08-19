"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import type { WebVitalMetric, VitalRating } from "@store/db";

const SESSION_KEY = "_im_sid";
const VISITOR_KEY = "_im_vid";

function getSessionId(): string {
	if (typeof window === "undefined") return "";
	try {
		let sid = sessionStorage.getItem(SESSION_KEY);
		if (!sid) {
			sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
			sessionStorage.setItem(SESSION_KEY, sid);
		}
		return sid;
	} catch {
		return `s_anon_${Date.now()}`;
	}
}

function getVisitorId(): string {
	if (typeof window === "undefined") return "";
	try {
		let vid = localStorage.getItem(VISITOR_KEY);
		if (!vid) {
			vid = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
			localStorage.setItem(VISITOR_KEY, vid);
		}
		return vid;
	} catch {
		return "";
	}
}

function sendTelemetry(payload: Record<string, unknown>) {
	if (typeof window === "undefined") return;

	const data = JSON.stringify(payload);
	if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
		const blob = new Blob([data], { type: "application/json" });
		const sent = navigator.sendBeacon("/api/telemetry", blob);
		if (sent) return;
	}

	void fetch("/api/telemetry", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: data,
		keepalive: true,
	}).catch(() => {
		// Telemetry is silent and non-blocking
	});
}

export function StorefrontTelemetry() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const prevPathRef = useRef<string | null>(null);
	const pageEnteredAtRef = useRef<number>(Date.now());

	// 1. Pageview & Engagement Duration Tracking
	useEffect(() => {
		if (!pathname) return;

		const fullPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
		const now = Date.now();

		// Record duration on previous page if navigating
		if (prevPathRef.current && prevPathRef.current !== fullPath) {
			const durationMs = now - pageEnteredAtRef.current;
			sendTelemetry({
				eventType: "page_view",
				path: prevPathRef.current,
				sessionId: getSessionId(),
				visitorId: getVisitorId(),
				durationMs,
			});
		}

		pageEnteredAtRef.current = now;
		prevPathRef.current = fullPath;

		// Send initial pageview event
		sendTelemetry({
			eventType: "page_view",
			path: fullPath,
			title: document.title,
			referrer: document.referrer || "direct",
			sessionId: getSessionId(),
			visitorId: getVisitorId(),
		});

		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden" && prevPathRef.current) {
				const durationMs = Date.now() - pageEnteredAtRef.current;
				sendTelemetry({
					eventType: "page_view",
					path: prevPathRef.current,
					sessionId: getSessionId(),
					visitorId: getVisitorId(),
					durationMs,
				});
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [pathname, searchParams]);

	// 2. Core Web Vitals Tracking (LCP, CLS, INP, FCP, TTFB)
	useReportWebVitals((metric) => {
		if (typeof window === "undefined") return;

		const name = metric.name.toUpperCase() as WebVitalMetric;
		const rating = (metric.rating as VitalRating) || "good";
		const value = name === "CLS" ? metric.value : Math.round(metric.value);

		sendTelemetry({
			eventType: "web_vital",
			path: pathname || window.location.pathname,
			sessionId: getSessionId(),
			visitorId: getVisitorId(),
			vitalMetric: name,
			vitalValue: value,
			vitalRating: rating,
		});
	});

	return null;
}
