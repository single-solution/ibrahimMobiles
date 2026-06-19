"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useShopHref } from "@/lib/core/storefrontReferenceContext";
import { prefetchAllowed } from "@/lib/navigation/prefetchAllowed";

/** Warm router cache for routes not covered by in-viewport `<Link prefetch>`. */
export function IdleRoutePrefetch() {
	const router = useRouter();
	const catalogHomeHref = useShopHref();

	useEffect(() => {
		if (!prefetchAllowed()) {
			return;
		}

		const routes = [catalogHomeHref, "/cart"];
		const run = () => {
			for (const route of routes) {
				try {
					router.prefetch(route);
				} catch {
					// ignore — bad URL or duplicate prefetch.
				}
			}
		};

		const supportsIdle = typeof window.requestIdleCallback === "function";
		if (supportsIdle) {
			const handle = window.requestIdleCallback(run, { timeout: 3000 });
			return () => window.cancelIdleCallback(handle);
		}

		const handle = window.setTimeout(run, 1500);
		return () => window.clearTimeout(handle);
	}, [catalogHomeHref, router]);

	return null;
}
