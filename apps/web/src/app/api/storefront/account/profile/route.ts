/**
 * Customer profile updates.
 *
 * PUT  → update name / email / city for the signed-in customer.
 *
 * Only the authenticated customer's own record is ever touched. The
 * `customerId` comes from the verified session — never from request body.
 */

import { Types } from "mongoose";

import { Customer, connectDB } from "@store/db";
import {
  FIELD_LIMITS,
  badRequest,
  isValidationError,
  logger,
  notFound,
  ok,
  parseBody,
  serverError,
  unauthorized,
  validateEmail,
  validateString,
} from "@store/shared";

import { auth } from "@/lib/auth";
import { enforceSameOrigin } from "@/lib/api/sameOrigin";

export const dynamic = "force-dynamic";

interface UpdateProfileBody {
  name?: unknown;
  email?: unknown;
  city?: unknown;
}

export async function PUT(request: Request) {
  const csrf = enforceSameOrigin(request);
  if (csrf) {
    return csrf;
  }
  const session = await auth();
  if (!session?.user || session.user.role !== "customer" || !session.user.customerId) {
    return unauthorized();
  }
  if (!Types.ObjectId.isValid(session.user.customerId)) {
    return unauthorized();
  }

  const parsed = await parseBody<UpdateProfileBody>(request);
  if (parsed instanceof Response) {
    return parsed;
  }

  const nameResult = validateString(parsed.name, {
    label: "Name",
    min: 2,
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const cityResult = validateString(parsed.city, {
    label: "City",
    min: 1,
    max: FIELD_LIMITS.city,
  });
  if (isValidationError(cityResult)) {
    return badRequest(cityResult.error);
  }

  let email: string | null = null;
  if (parsed.email !== undefined && parsed.email !== "") {
    const emailResult = validateEmail(parsed.email);
    if (isValidationError(emailResult)) {
      return badRequest(emailResult.error);
    }
    email = emailResult;
  }

  try {
    await connectDB();
    const updated = await Customer.findByIdAndUpdate(
      session.user.customerId,
      { name: nameResult, email, city: cityResult },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return notFound("Customer not found.");
    }
    return ok({
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email ?? null,
      city: updated.city,
    });
  } catch (error) {
    logger.error({ error }, "profile update failed");
    return serverError("Update failed");
  }
}
