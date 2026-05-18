/**
 * Public order-status check — used by the `/track` page so customers can
 * check progress without signing in.
 *
 * GET /api/storefront/order-status?orderNumber=&phone=
 *
 * Both fields are required. We compare the supplied phone with the stored
 * `customerSnapshot.phoneNumber` using `sameNumber` so the customer
 * doesn't have to remember the exact format they typed at checkout.
 *
 * Security:
 *   - Rate-limited per IP + (orderNumber+phone) — limits brute force.
 *   - Returns the same `{ found: false }` shape on a missing record AND on
 *     a wrong-phone match, so an attacker can't enumerate order numbers by
 *     timing/shape differences.
 *   - No PII is leaked from a bad phone match.
 */

import { Types } from "mongoose";

import { Order, connectDB, type OrderAttributes } from "@store/db";
import {
  badRequest,
  logger,
  MS_PER_MINUTE,
  ok,
  sameNumber,
  serverError,
} from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { toStorefrontOrder } from "@/lib/storefront/orderSerializer";

export const dynamic = "force-dynamic";

const MAX_FIELD_LENGTH = 32;
/** Track requests per IP+(orderNumber|phone) per `TRACKER_WINDOW_MS`. */
const TRACKER_LOOKUPS_PER_WINDOW = 20;
/** 5-minute lookup window — long enough that brute-force takes effort but
 *  short enough that legitimate retypes succeed without waiting. */
const TRACKER_WINDOW_MINUTES = 5;
const TRACKER_WINDOW_MS = TRACKER_WINDOW_MINUTES * MS_PER_MINUTE;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderNumber = (url.searchParams.get("orderNumber") ?? "").trim().toUpperCase();
  const phone = (url.searchParams.get("phone") ?? "").trim();

  const limited = enforcePublicRateLimit(request, {
    scope: "storefront-track",
    identifier: phone || orderNumber || undefined,
    max: TRACKER_LOOKUPS_PER_WINDOW,
    windowMs: TRACKER_WINDOW_MS,
  });
  if (limited) {
    return limited;
  }

  if (!orderNumber || !phone) {
    return badRequest("Order number and phone are required.");
  }

  if (orderNumber.length > MAX_FIELD_LENGTH || phone.length > MAX_FIELD_LENGTH) {
    return badRequest("Order number or phone is too long.");
  }

  try {
    await connectDB();
    const lean = await Order.findOne({ orderNumber })
      .lean<OrderAttributes & { _id: Types.ObjectId }>();

    if (!lean) {
      return ok({ found: false });
    }

    if (!sameNumber(lean.customerSnapshot?.phoneNumber, phone)) {
      logger.info({ orderNumber }, "track lookup: order found but phone mismatch");
      return ok({ found: false });
    }

    return ok({ found: true, order: toStorefrontOrder(lean) });
  } catch (error) {
    logger.error({ error, orderNumber }, "track lookup failed");
    return serverError("Lookup failed. Please try again.");
  }
}
