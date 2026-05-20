import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { BRAND_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  badRequest,
  created,
  isValidationError,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { Brand, connectDB, handleMongoError } from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@store/shared";

import { toBrandResponse, type BrandLean } from "@/lib/serializers/brand";
import type { AdminBrand } from "@/types/admin";

export async function GET(request: Request) {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);
  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: searchPattern, $options: "i" } },
      { slug: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    Brand.find(filter).sort({ sortOrder: 1, name: 1 }).skip(skip).limit(limit).lean<BrandLean[]>(),
    Brand.countDocuments(filter),
  ]);

  const payload: ListResponse<AdminBrand> = {
    items: docs.map(toBrandResponse),
    total,
    page,
    limit,
  };
  return ok(payload);
}

interface BrandInput {
  name?: unknown;
  categorySlugs?: unknown;
  slug?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

function validateCategorySlugs(input: unknown): string[] | { error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { error: "Brand must reference at least one category." };
  }
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string" || raw.trim().length === 0) {
      return { error: "Each category slug must be a non-empty string." };
    }
    out.push(slugify(raw, 64));
  }
  return out;
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("brand_manage");
  if (response) {
    return response;
  }

  const body = await parseBody<BrandInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const nameResult = validateString(body.name, { label: "Name", max: BRAND_FIELD_LIMITS.name });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const categorySlugsResult = validateCategorySlugs(body.categorySlugs);
  if ("error" in categorySlugsResult) {
    return badRequest(categorySlugsResult.error);
  }

  const slug =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? slugify(body.slug)
      : slugify(nameResult);
  if (slug.length === 0) {
    return badRequest("Slug could not be derived from name.");
  }

  await connectDB();
  try {
    const doc = await Brand.create({
      slug,
      name: nameResult,
      categorySlugs: categorySlugsResult,
      isActive: body.isActive !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "brand",
      resourceId: doc._id.toString(),
      resourceLabel: doc.name,
    });
    bustAdminCaches();
    return created(toBrandResponse(doc.toObject() as unknown as BrandLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
