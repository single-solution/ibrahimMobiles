import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  isValidationError,
  isValidId,
  noContent,
  notFound,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { Attribute, connectDB, handleMongoError } from "@store/db";
import { ATTRIBUTE_CARD_POSITIONS } from "@store/db";

import { ATTRIBUTE_FIELD_LIMITS } from "@/lib/api/fieldLimits";
import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import {
  toAttributeResponse,
  type AttributeLean,
} from "@/lib/serializers/attribute";
import { parseAttributeOptions } from "@/lib/api/attributesPayload";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AttributeUpdateInput {
  label?: unknown;
  options?: unknown;
  cardPosition?: unknown;
  isActive?: unknown;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("category_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<AttributeUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.label !== undefined) {
    const result = validateString(body.label, {
      label: "Label",
      max: ATTRIBUTE_FIELD_LIMITS.label,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.label = result;
  }
  if (body.options !== undefined) {
    const parsed = parseAttributeOptions(body.options);
    if ("error" in parsed) {
      return badRequest(parsed.error);
    }
    update.options = parsed.options;
  }
  if (body.cardPosition !== undefined) {
    if (
      typeof body.cardPosition !== "string" ||
      !(ATTRIBUTE_CARD_POSITIONS as readonly string[]).includes(body.cardPosition)
    ) {
      return badRequest(
        `cardPosition must be one of: ${ATTRIBUTE_CARD_POSITIONS.join(", ")}.`,
      );
    }
    update.cardPosition = body.cardPosition;
  }
  if (body.isActive !== undefined) {
    update.isActive = body.isActive !== false;
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  try {
    const doc = await Attribute.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean<AttributeLean>();
    if (!doc) {
      return notFound("Attribute not found");
    }
    await recordActivity({
      actor,
      action: "updated",
      resourceType: "attribute",
      resourceId: id,
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return ok(toAttributeResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("category_manage");
  if (response) {
    return response;
  }
  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  try {
    const doc = await Attribute.findByIdAndDelete(id).lean<AttributeLean>();
    if (!doc) {
      return notFound("Attribute not found");
    }
    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "attribute",
      resourceId: id,
      resourceLabel: doc.label,
    });
    bustAdminCaches();
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
