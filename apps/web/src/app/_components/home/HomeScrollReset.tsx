"use client";

import { useLayoutEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Scroll to top when home catalog filters or category params change. */
export function HomeScrollReset() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const queryKey = searchParams?.toString() ?? "";

	useLayoutEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "instant" });
	}, [pathname, queryKey]);

	return null;
}
