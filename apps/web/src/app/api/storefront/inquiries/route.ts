/**
 * Public "We Buy / Sell to us" inquiry endpoint.
 *
 * The storefront's `/sell` and product CTAs post here. Auth-less by design —
 * customers are not signed in. Hardened with:
 *
 *   - Strict body validation through the same validators the admin uses, so
 *     nothing slips into the DB without trimming + length caps.
 *   - Rate limit per (IP, phone) to throttle drive-by spam without blocking
 *     a shared NAT.
 *   - A canonical `source: "website"` so admins can filter by entry point.
 *   - Optional `productId` field — if provided we sanity-check it as an
 *     ObjectId before storing.
 */

import { Inquiry, connectDB } from "@store/db";
import {
  FIELD_LIMITS,
  MAX_INPUT_LENGTH,
  badRequest,
  created,
  isValidId,
  isValidationError,
  logger,
  parseBody,
  SHORT_BURST_WINDOW_MS,
  serverError,
  validateLongText,
  validateString,
} from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";

/** Inquiries per IP+phone within the short-burst window. */
const MAX_INQUIRIES_PER_WINDOW = 5;

interface InquiryBody {
  customerName?: unknown;
  customerCity?: unknown;
  phoneNumber?: unknown;
  modelName?: unknown;
  variantSummary?: unknown;
  expectedRupees?: unknown;
  message?: unknown;
  productId?: unknown;
}

export async function POST(request: Request) {
  const parsed = await parseBody<InquiryBody>(request);
  if (parsed instanceof Response) {
    return parsed;
  }
  const body = parsed;

  // Read phone first so we can use it as a rate-limit key. Validation runs
  // again below for the canonical trimmed value.
  const phoneRaw = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const limited = enforcePublicRateLimit(request, {
    scope: "storefront-inquiry",
    identifier: phoneRaw || undefined,
    max: MAX_INQUIRIES_PER_WINDOW,
    windowMs: SHORT_BURST_WINDOW_MS,
  });
  if (limited) {
    return limited;
  }

  const nameResult = validateString(body.customerName, {
    label: "Name",
    min: 2,
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const cityResult = validateString(body.customerCity, {
    label: "City",
    min: 2,
    max: FIELD_LIMITS.city,
  });
  if (isValidationError(cityResult)) {
    return badRequest(cityResult.error);
  }

  const phoneResult = validateString(body.phoneNumber, {
    label: "Phone",
    min: 7,
    max: FIELD_LIMITS.phoneNumber,
  });
  if (isValidationError(phoneResult)) {
    return badRequest(phoneResult.error);
  }

  const modelResult = validateString(body.modelName, {
    label: "Model",
    min: 2,
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(modelResult)) {
    return badRequest(modelResult.error);
  }

  const messageResult = validateLongText(body.message, "Message", true);
  if (isValidationError(messageResult)) {
    return badRequest(messageResult.error);
  }

  let variantSummary: string | undefined;
  if (typeof body.variantSummary === "string" && body.variantSummary.trim().length > 0) {
    const result = validateString(body.variantSummary, {
      label: "Variant",
      max: MAX_INPUT_LENGTH,
      required: false,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    variantSummary = result;
  }

  let expectedRupees: number | undefined;
  if (typeof body.expectedRupees === "number") {
    if (!Number.isFinite(body.expectedRupees) || body.expectedRupees < 0) {
      return badRequest("Expected price must be a non-negative number.");
    }
    expectedRupees = Math.round(body.expectedRupees);
  }

  // productId is optional — only store it when it's a valid ObjectId so we
  // don't insert a CastError-trap into the DB.
  const productId = isValidId(body.productId) ? body.productId : undefined;

  await connectDB();
  try {
    const doc = await Inquiry.create({
      customerName: nameResult,
      customerCity: cityResult,
      phoneNumber: phoneResult,
      modelName: modelResult,
      variantSummary,
      expectedRupees,
      source: "website",
      status: "new",
      receivedAt: new Date(),
      lastMessage: messageResult,
      productId,
    });
    return created({ id: doc._id.toString() });
  } catch (error) {
    logger.error({ error }, "Failed to create public inquiry");
    return serverError("Could not submit your inquiry. Please try again.");
  }
}
