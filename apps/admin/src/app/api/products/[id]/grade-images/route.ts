import { requireSession } from "@/lib/api/requireSession";
import { validateGradeImages } from "@/lib/api/gradeImagesValidation";
import {
  badRequest,
  coerceStoredImage,
  isValidId,
  normalizeGradeSlug,
  notFound,
  ok,
  parseBody,
  type ProductGradeImagesEntry,
} from "@store/shared";
import { Brand, connectDB, handleMongoError, Product } from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import {
  toProductResponse,
  type ProductLean,
} from "@/lib/serializers/product";
import { type BrandLean } from "@/lib/serializers/brand";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface GradeImagesUpdateInput {
  gradeImages?: unknown;
  /** Grades that must have a gallery in this save (from the variant editor). */
  requiredGradeSlugs?: unknown;
}

function resolveGradesWithVariants(
  requiredGradeSlugs: unknown,
  variantGradeSlugs: string[],
): Set<string> {
  const fromBody = Array.isArray(requiredGradeSlugs)
    ? requiredGradeSlugs.filter(
        (slug): slug is string => typeof slug === "string" && slug.trim().length > 0,
      )
    : [];
  const source = fromBody.length > 0 ? fromBody : variantGradeSlugs;
  return new Set(source.map((slug) => slug.trim().toLowerCase()));
}

function storedImagesFromUnknown(images: unknown[] | undefined) {
  return (images ?? [])
    .map(coerceStoredImage)
    .filter((image): image is NonNullable<typeof image> => image !== null);
}

/** Incoming galleries win; other persisted grade rows with photos are kept. */
function mergeGradeImages(
  existing: ProductGradeImagesEntry[],
  incoming: ProductGradeImagesEntry[],
): ProductGradeImagesEntry[] {
  const map = new Map<string, ProductGradeImagesEntry>();
  for (const entry of existing) {
    const slug = normalizeGradeSlug(entry.gradeSlug);
    const images = storedImagesFromUnknown(entry.images);
    if (!slug || images.length === 0) continue;
    map.set(slug, { gradeSlug: slug, images });
  }
  for (const entry of incoming) {
    const slug = normalizeGradeSlug(entry.gradeSlug);
    const images = storedImagesFromUnknown(entry.images);
    if (!slug || images.length === 0) continue;
    map.set(slug, { gradeSlug: slug, images });
  }
  return [...map.values()];
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("product_update");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid product ID.");
  }

  const body = await parseBody<GradeImagesUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  if (!Array.isArray(body.gradeImages)) {
    return badRequest("gradeImages must be an array.");
  }

  await connectDB();
  const product = await Product.findById(id)
    .select("categorySlug brandSlug name gradeImages variants.gradeSlug")
    .lean<{
      categorySlug: string;
      brandSlug: string;
      name: string;
      gradeImages?: ProductGradeImagesEntry[];
      variants: Array<{ gradeSlug: string }>;
    }>();
  if (!product) {
    return notFound("Product not found");
  }

  const gradesWithVariants = resolveGradesWithVariants(
    body.requiredGradeSlugs,
    product.variants.map((row) => row.gradeSlug),
  );
  if (gradesWithVariants.size === 0) {
    return badRequest("Add at least one variant before saving grade photos.");
  }
  for (const gradeSlug of gradesWithVariants) {
    const hasGallery = (body.gradeImages as Array<{ gradeSlug?: unknown; images?: unknown }>).some(
      (row) =>
        typeof row?.gradeSlug === "string" &&
        row.gradeSlug.trim().toLowerCase() === gradeSlug &&
        Array.isArray(row.images) &&
        row.images.length > 0,
    );
    if (!hasGallery) {
      return badRequest(`Add at least one photo for grade '${gradeSlug}'.`);
    }
  }

  const result = await validateGradeImages(
    body.gradeImages as Parameters<typeof validateGradeImages>[0],
    product.categorySlug,
    { requireImagesForGrades: gradesWithVariants },
  );
  if (!result.ok) {
    return badRequest(result.error);
  }

  const mergedGradeImages = mergeGradeImages(
    (product.gradeImages ?? []) as ProductGradeImagesEntry[],
    result.value,
  );
  if (mergedGradeImages.length === 0) {
    return badRequest("Could not save grade photos. Upload through /api/uploads and try again.");
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        $set: { gradeImages: mergedGradeImages },
        $unset: { "variants.$[].images": "" },
      },
      { returnDocument: "after", runValidators: true },
    ).lean<ProductLean>();
    if (!updatedProduct) {
      return notFound("Product not found");
    }

    const brand = await Brand.findOne({
      slug: updatedProduct.brandSlug,
      categorySlugs: updatedProduct.categorySlug,
    }).lean<BrandLean>();

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "product",
      resourceId: id,
      resourceLabel: product.name,
      detail: "Grade photos updated",
    });
    bustAdminCaches();
    return ok(toProductResponse(updatedProduct, brand ?? undefined));
  } catch (error) {
    if (error instanceof Error && error.name === "ValidationError") {
      const validationError = error as Error & {
        errors?: Record<string, { message?: string }>;
      };
      const detail = Object.values(validationError.errors ?? {})
        .map((row) => row.message)
        .find(Boolean);
      if (detail) {
        return badRequest(detail);
      }
    }
    return handleMongoError(error);
  }
}
