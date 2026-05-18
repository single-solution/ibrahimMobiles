import { requireSession } from "@/lib/api/requireSession";
import { badRequest, created, isValidId, notFound, parseBody } from "@store/shared";
import {
  Brand,
  connectDB,
  handleMongoError,
  Product,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import { validateVariant, type VariantInput } from "@/lib/api/variantValidation";
import { toProductResponse, type ProductLean } from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("product_update");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid product ID.");
  }

  const body = await parseBody<VariantInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const result = validateVariant(body, true);
  if (!result.ok) {
    return badRequest(result.error);
  }

  await connectDB();
  try {
    const updated = await Product.findByIdAndUpdate(
      id,
      { $push: { variants: result.value } },
      { new: true, runValidators: true },
    ).lean<ProductLean>();
    if (!updated) {
      return notFound("Product not found");
    }

    const brand = await Brand.findById(updated.brandId).lean<BrandLean>();
    await recordActivity({
      actor,
      action: "updated",
      resourceType: "product",
      resourceId: id,
      resourceLabel: updated.modelName,
      detail: "Variant added",
    });
    bustAdminCaches();
    return created(toProductResponse(updated, brand ?? undefined));
  } catch (error) {
    return handleMongoError(error);
  }
}
