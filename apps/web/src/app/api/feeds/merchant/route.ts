/**
 * GET /api/feeds/merchant?format=xml|csv
 *
 * One row per in-stock variant for Google Merchant Center and Meta catalog import.
 * Optional `MERCHANT_FEED_TOKEN` env — when set, pass `?token=` or `Authorization: Bearer`.
 */

import { logger, serializeMerchantFeedCsv, serializeMerchantFeedXml } from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { getMerchantFeedRowsCached } from "@/lib/seo/merchantFeedLoader";
import { getSeoSettings } from "@/lib/seo/seoSettings";

export const dynamic = "force-dynamic";

const FEED_REQUESTS_PER_MINUTE = 30;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600";

function enforceMerchantFeedToken(request: Request): Response | null {
	const expected = process.env.MERCHANT_FEED_TOKEN?.trim();
	if (!expected) {
		return null;
	}

	const url = new URL(request.url);
	const queryToken = url.searchParams.get("token")?.trim();
	const authHeader = request.headers.get("authorization")?.trim() ?? "";
	const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

	if (queryToken === expected || bearerToken === expected) {
		return null;
	}

	return new Response("Unauthorized", { status: 401 });
}

export async function GET(request: Request) {
	const unauthorized = enforceMerchantFeedToken(request);
	if (unauthorized) {
		return unauthorized;
	}

	const limited = enforcePublicRateLimit(request, {
		scope: "storefront-merchant-feed",
		max: FEED_REQUESTS_PER_MINUTE,
		windowMs: 60_000,
	});
	if (limited) {
		return limited;
	}

	const url = new URL(request.url);
	const format = (url.searchParams.get("format") ?? "xml").toLowerCase();

	try {
		const [rows, seoSettings] = await Promise.all([getMerchantFeedRowsCached(), getSeoSettings()]);
		const channel = {
			title: `${seoSettings.siteName} product feed`,
			link: seoSettings.siteUrl,
			description: `In-stock variant feed for ${seoSettings.siteName}`,
		};

		if (format === "csv") {
			return new Response(serializeMerchantFeedCsv(rows), {
				status: 200,
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Cache-Control": CACHE_CONTROL,
					"Content-Disposition": 'attachment; filename="merchant-feed.csv"',
				},
			});
		}

		if (format !== "xml") {
			return new Response("format must be xml or csv", { status: 400 });
		}

		return new Response(serializeMerchantFeedXml(rows, channel), {
			status: 200,
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Cache-Control": CACHE_CONTROL,
			},
		});
	} catch (error) {
		logger.error({ error }, "merchant feed generation failed");
		return new Response("Feed generation failed", { status: 500 });
	}
}
