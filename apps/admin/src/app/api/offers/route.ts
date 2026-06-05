import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { OFFER_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  badRequest,
  created,
  isValidationError,
  normalizeStructuredContent,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { connectDB, handleMongoError, Offer } from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@store/shared";

import { toOfferResponse, type OfferLean } from "@/lib/serializers/offer";
import type { AdminOffer } from "@/types/models";
import { parseSeoPayload } from "@/lib/api/seoPayload";

export async function GET(request: Request) {
  const { response } = await requireSession("product_view");
  if (response) {
    return response;
  }

  try {
    await connectDB();
    const { page, limit, skip, search, searchPattern } = readListOptions(request);

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { title: { $regex: searchPattern, $options: "i" } },
        { slug: { $regex: searchPattern, $options: "i" } },
        { badgeLabel: { $regex: searchPattern, $options: "i" } },
      ];
    }

    const [docs, total] = await Promise.all([
      Offer.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<OfferLean[]>(),
      Offer.countDocuments(filter),
    ]);

    const payload: ListResponse<AdminOffer> = {
      items: docs.map(toOfferResponse),
      total,
      page,
      limit,
    };
    return ok(payload);
  } catch (error) {
    return handleMongoError(error);
  }
}

interface OfferInput {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  discountLabel?: unknown;
  badgeLabel?: unknown;
  color?: unknown;
  bannerImage?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
  content?: unknown;
  seo?: unknown;
  conditions?: unknown;
  action?: unknown;
  schedule?: unknown;
  constraints?: unknown;
}

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i;
const DEFAULT_OFFER_COLOR = "#e1ff51";

function parseColor(value: unknown): string {
  if (typeof value === "string" && HEX_COLOR_REGEX.test(value)) {
    return value;
  }
  return DEFAULT_OFFER_COLOR;
}

export async function POST(request: Request) {
  const { actor, response } = await requireSession("offer_manage");
  if (response) {
    return response;
  }

  const body = await parseBody<OfferInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const titleResult = validateString(body.title, { label: "Title", max: OFFER_FIELD_LIMITS.title });
  if (isValidationError(titleResult)) {
    return badRequest(titleResult.error);
  }

  const descriptionResult = validateString(body.description, { label: "Description", max: OFFER_FIELD_LIMITS.description });
  if (isValidationError(descriptionResult)) {
    return badRequest(descriptionResult.error);
  }

  const discountResult = validateString(body.discountLabel, { label: "Discount label", max: OFFER_FIELD_LIMITS.discountLabel });
  if (isValidationError(discountResult)) {
    return badRequest(discountResult.error);
  }

  const badgeResult = validateString(body.badgeLabel, { label: "Badge label", max: OFFER_FIELD_LIMITS.badgeLabel });
  if (isValidationError(badgeResult)) {
    return badRequest(badgeResult.error);
  }

  const slugSource =
    typeof body.slug === "string" && body.slug.trim().length > 0 ? body.slug : titleResult;
  const slug = slugify(slugSource);
  if (slug.length === 0) {
    return badRequest("Slug could not be derived.");
  }

  let seo: Record<string, unknown> | undefined;
  if (body.seo !== undefined) {
    const parsed = parseSeoPayload(body.seo);
    if ("response" in parsed) {
      return parsed.response;
    }
    if ("seo" in parsed) {
      seo = parsed.seo as Record<string, unknown>;
    }
  }

  const content = normalizeStructuredContent(body.content, descriptionResult);

  await connectDB();
  try {
    const doc = await Offer.create({
      slug,
      title: titleResult,
      description: content.summary || descriptionResult,
      discountLabel: discountResult,
      badgeLabel: badgeResult,
      color: parseColor(body.color),
      bannerImage:
        body.bannerImage && typeof body.bannerImage === "object"
          ? body.bannerImage
          : undefined,
      isActive: body.isActive !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      content,
      conditions: Array.isArray(body.conditions) ? body.conditions : [],
      action: typeof body.action === "object" && body.action !== null ? body.action : { type: "percentage_discount", value: 10, target: "matched_items" },
      schedule: typeof body.schedule === "object" && body.schedule !== null ? body.schedule : {},
      constraints: typeof body.constraints === "object" && body.constraints !== null ? body.constraints : { allowLoyaltyPoints: false, isStackable: false, usageCount: 0 },
      ...(seo ? { seo } : {}),
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "offer",
      resourceId: doc._id.toString(),
      resourceLabel: doc.title,
    });
    bustAdminCaches();
    return created(toOfferResponse(doc.toObject() as unknown as OfferLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
