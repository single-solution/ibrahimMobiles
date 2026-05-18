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
  FIELD_LIMITS,
  badRequest,
  isValidationError,
  logger,
  notFound,
  ok,
  parseBody,
  serverError,
  unauthorized,
  validateString,
} from "@store/shared";

import { auth } from "@/lib/auth";
import { enforceSameOrigin } from "@/lib/api/sameOrigin";

export const dynamic = "force-dynamic";

interface AddressInput {
  label?: unknown;
  recipientName?: unknown;
  phoneNumber?: unknown;
  city?: unknown;
  area?: unknown;
  street?: unknown;
  postalCode?: unknown;
  isDefault?: unknown;
}

interface UpdateAddressesBody {
  addresses?: AddressInput[];
}

interface ValidatedAddress {
  label?: string;
  recipientName: string;
  phoneNumber: string;
  city: string;
  area?: string;
  street?: string;
  postalCode?: string;
  isDefault: boolean;
}

const MAX_ADDRESSES = 6;

function validateOptionalField(
  raw: unknown,
  label: string,
  max: number,
): { value?: string; error?: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { value: undefined };
  }
  const result = validateString(raw, { label, required: false, max });
  if (isValidationError(result)) {
    return { error: result.error };
  }
  return { value: result || undefined };
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
  const list = parsed.addresses;
  if (!Array.isArray(list)) {
    return badRequest("Addresses must be an array.");
  }
  if (list.length > MAX_ADDRESSES) {
    return badRequest(`You can save up to ${MAX_ADDRESSES} addresses.`);
  }

  const validated: ValidatedAddress[] = [];
  for (let index = 0; index < list.length; index += 1) {
    const entry = list[index];
    const positionLabel = `Address #${index + 1}`;

    const recipient = validateString(entry.recipientName, {
      label: `${positionLabel} recipient`,
      min: 1,
      max: FIELD_LIMITS.recipientName,
    });
    if (isValidationError(recipient)) {
      return badRequest(recipient.error);
    }

    const phone = validateString(entry.phoneNumber, {
      label: `${positionLabel} phone`,
      min: 5,
      max: FIELD_LIMITS.phoneNumber,
    });
    if (isValidationError(phone)) {
      return badRequest(phone.error);
    }

    const city = validateString(entry.city, {
      label: `${positionLabel} city`,
      min: 1,
      max: FIELD_LIMITS.city,
    });
    if (isValidationError(city)) {
      return badRequest(city.error);
    }

    const street = validateOptionalField(entry.street, `${positionLabel} street`, FIELD_LIMITS.addressStreet);
    if (street.error) {
      return badRequest(street.error);
    }

    const area = validateOptionalField(entry.area, `${positionLabel} area`, FIELD_LIMITS.addressArea);
    if (area.error) {
      return badRequest(area.error);
    }

    const postal = validateOptionalField(entry.postalCode, `${positionLabel} postcode`, FIELD_LIMITS.postalCode);
    if (postal.error) {
      return badRequest(postal.error);
    }

    const labelInput = validateOptionalField(entry.label, `${positionLabel} label`, FIELD_LIMITS.addressLabel);
    if (labelInput.error) {
      return badRequest(labelInput.error);
    }

    validated.push({
      label: labelInput.value,
      recipientName: recipient,
      phoneNumber: phone,
      city,
      area: area.value,
      street: street.value,
      postalCode: postal.value,
      isDefault: entry.isDefault === true,
    });
  }

  // Exactly one default. If multiple are marked, last one wins; if none, first.
  let defaultIndex = validated.findIndex((address) => address.isDefault);
  if (defaultIndex < 0 && validated.length > 0) {
    defaultIndex = 0;
  }
  validated.forEach((address, index) => {
    address.isDefault = index === defaultIndex;
  });

  try {
    await connectDB();
    const updated = await Customer.findByIdAndUpdate(
      session.user.customerId,
      { addresses: validated },
      { new: true, runValidators: true },
    );
    if (!updated) {
      return notFound("Customer not found.");
    }
    return ok({ addresses: validated });
  } catch (error) {
    logger.error({ error }, "address update failed");
    return serverError("Update failed");
  }
}
