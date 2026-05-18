import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import { OFFER_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import {
  badRequest,
  created,
  isValidationError,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import {
  connectDB,
  handleMongoError,
  Offer,
  OFFER_ACCENT_COLORS,
  type OfferAccentColor,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@/lib/services/slug";

import { toOfferResponse, type OfferLean } from "@/lib/serializers/offer";
import type { AdminOffer } from "@/types/admin";

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
}

interface OfferInput {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  discountLabel?: unknown;
  badgeLabel?: unknown;
  accentColor?: unknown;
  expiresAt?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
}

function parseAccentColor(value: unknown): OfferAccentColor {
  if (typeof value === "string" && (OFFER_ACCENT_COLORS as readonly string[]).includes(value)) {
    return value as OfferAccentColor;
  }
  return "amber";
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

  let expiresAt: Date | undefined;
  if (typeof body.expiresAt === "string" && body.expiresAt.length > 0) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return badRequest("Invalid expiry date.");
    }
    expiresAt = parsed;
  }

  await connectDB();
  try {
    const doc = await Offer.create({
      slug,
      title: titleResult,
      description: descriptionResult,
      discountLabel: discountResult,
      badgeLabel: badgeResult,
      accentColor: parseAccentColor(body.accentColor),
      expiresAt,
      isActive: body.isActive !== false,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "offer",
      resourceId: doc._id.toString(),
      resourceLabel: doc.title,
    });
    bustAdminCaches();
    return created(toOfferResponse(doc.toObject() as OfferLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
