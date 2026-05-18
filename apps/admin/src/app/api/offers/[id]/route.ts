import {
  connectDB,
  handleMongoError,
  Offer,
  OFFER_ACCENT_COLORS,
} from "@store/db";
import {
  badRequest,
  isValidId,
  isValidationError,
  noContent,
  notFound,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { requireSession } from "@/lib/api/requireSession";
import { bustAdminCaches } from "@/lib/cached";
import { toOfferResponse, type OfferLean } from "@/lib/serializers/offer";
import { recordActivity } from "@/lib/services/activityLog";
import { slugify } from "@/lib/services/slug";
import { OFFER_FIELD_LIMITS } from "@/lib/api/fieldLimits";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { response } = await requireSession();
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  const doc = await Offer.findById(id).lean<OfferLean>();
  if (!doc) {
    return notFound("Offer not found");
  }

  return ok(toOfferResponse(doc));
}

interface OfferUpdateInput {
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

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("offer_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<OfferUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const result = validateString(body.title, { label: "Title", max: OFFER_FIELD_LIMITS.title });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.title = result;
  }
  if (body.description !== undefined) {
    const result = validateString(body.description, { label: "Description", max: OFFER_FIELD_LIMITS.description });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.description = result;
  }
  if (body.discountLabel !== undefined) {
    const result = validateString(body.discountLabel, { label: "Discount label", max: OFFER_FIELD_LIMITS.discountLabel });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.discountLabel = result;
  }
  if (body.badgeLabel !== undefined) {
    const result = validateString(body.badgeLabel, { label: "Badge label", max: OFFER_FIELD_LIMITS.badgeLabel });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.badgeLabel = result;
  }
  if (body.accentColor !== undefined) {
    if (
      typeof body.accentColor !== "string" ||
      !(OFFER_ACCENT_COLORS as readonly string[]).includes(body.accentColor)
    ) {
      return badRequest("Invalid accent color.");
    }
    update.accentColor = body.accentColor;
  }
  if (body.slug !== undefined && typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (slug.length === 0) {
      return badRequest("Slug cannot be empty.");
    }
    update.slug = slug;
  }
  if (body.expiresAt !== undefined) {
    if (body.expiresAt === null || body.expiresAt === "") {
      update.expiresAt = null;
    } else if (typeof body.expiresAt === "string") {
      const parsed = new Date(body.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return badRequest("Invalid expiry date.");
      }
      update.expiresAt = parsed;
    } else {
      return badRequest("Invalid expiry date.");
    }
  }
  if (body.isActive !== undefined) {
    update.isActive = Boolean(body.isActive);
  }
  if (typeof body.sortOrder === "number") {
    update.sortOrder = body.sortOrder;
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Offer.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean<OfferLean>();
    if (!doc) {
      return notFound("Offer not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "offer",
      resourceId: id,
      resourceLabel: doc.title,
    });
    bustAdminCaches();
    return ok(toOfferResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("offer_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  try {
    const doc = await Offer.findByIdAndDelete(id).lean<OfferLean>();
    if (!doc) {
      return notFound("Offer not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "offer",
      resourceId: id,
      resourceLabel: doc.title,
    });
    bustAdminCaches();
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
