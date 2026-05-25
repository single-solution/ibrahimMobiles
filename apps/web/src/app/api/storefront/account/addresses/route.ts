/**
 * Customer addresses (full replacement).
 *
 * PUT /api/storefront/account/addresses { addresses: AddressInput[] }
 *
 * Replaces the customer's `addresses` array atomically. Exactly one entry
 * is allowed to be `isDefault: true`; if none is marked, the first becomes
 * default.
 *
 * Validates every field server-side; the client-side form is for UX only.
 */

import { Types } from "mongoose";

import { Customer, connectDB } from "@store/db";
import {
  badRequest,
  logger,
  notFound,
  ok,
  parseBody,
  serverError,
  unauthorized,
  validateCustomerAddresses,
} from "@store/shared";

import { auth } from "@/lib/auth";
import { enforceSameOrigin } from "@/lib/api/sameOrigin";

export const dynamic = "force-dynamic";

interface UpdateAddressesBody {
  addresses?: unknown;
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

  const parsed = await parseBody<UpdateAddressesBody>(request);
  if (parsed instanceof Response) {
    return parsed;
  }

  const validated = validateCustomerAddresses(parsed.addresses);
  if ("error" in validated) {
    return badRequest(validated.error);
  }

  try {
    await connectDB();
    const updated = await Customer.findByIdAndUpdate(
      session.user.customerId,
      { addresses: validated.addresses },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return notFound("Customer not found.");
    }
    return ok({ addresses: validated.addresses });
  } catch (error) {
    logger.error({ error }, "address update failed");
    return serverError("Update failed");
  }
}
