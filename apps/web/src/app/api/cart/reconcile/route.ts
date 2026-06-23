import { badRequest, ok, parseBody } from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { type CartReconcileInputLine, reconcileCartLines } from "@/lib/cart/reconcileCartLines";

export const dynamic = "force-dynamic";

const RECONCILE_PER_MINUTE = 60;

interface ReconcileBody {
	items?: unknown;
}

export async function POST(request: Request) {
	const limited = enforcePublicRateLimit(request, {
		scope: "storefront-cart-reconcile",
		max: RECONCILE_PER_MINUTE,
		windowMs: 60_000,
	});
	if (limited) {
		return limited;
	}

	const body = await parseBody<ReconcileBody>(request);
	if (body instanceof Response) {
		return body;
	}

	if (!Array.isArray(body.items) || body.items.length === 0) {
		return badRequest("items must be a non-empty array.");
	}

	const lines: CartReconcileInputLine[] = [];
	const skipped: { id: string; message: string }[] = [];
	for (const raw of body.items) {
		if (!raw || typeof raw !== "object") {
			continue;
		}
		const candidate = raw as Partial<CartReconcileInputLine>;
		if (typeof candidate.id !== "string" || typeof candidate.productId !== "string" || typeof candidate.variantId !== "string") {
			continue;
		}
		const gradeSlug = typeof candidate.gradeSlug === "string" ? candidate.gradeSlug : "";
		if (gradeSlug.trim().length === 0) {
			skipped.push({
				id: candidate.id,
				message: "This cart line is out of date. Remove it and add the product again from its page.",
			});
			continue;
		}
		lines.push({
			id: candidate.id,
			productId: candidate.productId,
			variantId: candidate.variantId,
			gradeSlug,
			attributes: candidate.attributes && typeof candidate.attributes === "object" && !Array.isArray(candidate.attributes) ? candidate.attributes : {},
		});
	}

	if (lines.length === 0 && skipped.length === 0) {
		return badRequest("No valid cart lines to reconcile.");
	}

	const results = await reconcileCartLines(lines);
	for (const entry of skipped) {
		results.push({
			id: entry.id,
			status: "unavailable",
			message: entry.message,
		});
	}
	return ok({ lines: results });
}
