import { revalidateTag } from "next/cache";

import { reconcileAllSeoSurfaces } from "@store/db";
import { logger } from "@store/shared";

import { STOREFRONT_CACHE_TAG } from "@/lib/core/cached";

const REVALIDATE_PROFILE = "max" as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
	const secret = process.env.CRON_SECRET?.trim();
	if (!secret) {
		return false;
	}
	const authHeader = request.headers.get("authorization");
	return authHeader === `Bearer ${secret}`;
}

/** Nightly SEO reconciliation: refresh intent-surface stats and bust storefront cache. */
export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const result = await reconcileAllSeoSurfaces();
		revalidateTag(STOREFRONT_CACHE_TAG, REVALIDATE_PROFILE);
		return Response.json({ ok: true, ...result });
	} catch (error) {
		logger.error({ error }, "cron/seo-reconcile: failed");
		return Response.json({ ok: false, error: "Reconciliation failed" }, { status: 500 });
	}
}
