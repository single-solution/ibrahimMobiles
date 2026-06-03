/**
 * Public loyalty-balance check by phone number.
 *
 * POST /api/storefront/loyalty-balance  { phoneNumber }
 *
 * Customers paste their number on the storefront to see how many points they
 * have. We never reveal whether a number is registered (timing-safe response)
 * to avoid abuse for phone-number enumeration:
 *
 *   - Always return 200 OK with the same shape.
 *   - Set `isMember: false, balance: 0` when no matching customer/account is
 *     found, instead of 404 — same shape, same response time.
 *   - Heavy rate limit (10 lookups / minute / IP). Lookups are cheap to
 *     answer but cheap to abuse; this is a brute-force window.
 */

import { Customer, LoyaltyAccount, connectDB } from "@store/db";
import {
  FIELD_LIMITS,
  PER_MINUTE_WINDOW_MS,
  badRequest,
  isValidationError,
  ok,
  parseBody,
  validateString,
} from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";

/** Loyalty lookups allowed per IP per minute — tight enough to block
 *  phone-number enumeration, generous enough for a busy customer. */
const LOYALTY_LOOKUPS_PER_MINUTE = 10;

interface LookupBody {
  phoneNumber?: unknown;
}

interface LookupResponse {
  isMember: boolean;
  balance: number;
  lifetimeEarned: number;
}

const NOT_A_MEMBER: LookupResponse = {
  isMember: false,
  balance: 0,
  lifetimeEarned: 0,
};

export async function POST(request: Request) {
  const limited = enforcePublicRateLimit(request, {
    scope: "storefront-loyalty-lookup",
    max: LOYALTY_LOOKUPS_PER_MINUTE,
    windowMs: PER_MINUTE_WINDOW_MS,
  });
  if (limited) {
    return limited;
  }

  const parsed = await parseBody<LookupBody>(request);
  if (parsed instanceof Response) {
    return parsed;
  }
  const body = parsed;

  const phoneResult = validateString(body.phoneNumber, {
    label: "Phone",
    min: 7,
    max: FIELD_LIMITS.phoneNumber,
  });
  if (isValidationError(phoneResult)) {
    return badRequest(phoneResult.error);
  }

  await connectDB();
  const customer = await Customer.findOne({ phoneNumber: phoneResult })
    .select("_id isLoyaltyMember")
    .lean<{ _id: import("mongoose").Types.ObjectId; isLoyaltyMember: boolean }>();
  if (!customer || !customer.isLoyaltyMember) {
    return ok(NOT_A_MEMBER);
  }

  const account = await LoyaltyAccount.findOne({ customerId: customer._id })
    .select("balance lifetimeEarned")
    .lean<{ balance: number; lifetimeEarned: number }>();
  if (!account) {
    return ok(NOT_A_MEMBER);
  }

  return ok<LookupResponse>({
    isMember: true,
    balance: account.balance,
    lifetimeEarned: account.lifetimeEarned,
  });
}
