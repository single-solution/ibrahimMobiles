import { isValidId, notFound, ok } from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { bustAdminCaches } from "@/lib/cached";
import { regenerateProductSeoResponse } from "@/lib/seo/regenerateProductSeo";

interface RouteContext {
	params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteContext) {
	const { response } = await requireSession("product_update");
	if (response) {
		return response;
	}

	const { id } = await params;
	if (!isValidId(id)) {
		return notFound("Product not found");
	}

	const result = await regenerateProductSeoResponse(id);
	if (!result) {
		return notFound("Product not found");
	}

	bustAdminCaches();
	return ok({
		ok: result.ok,
		source: result.source,
		message: result.message,
		seo: result.seo,
		product: result.product,
	});
}
