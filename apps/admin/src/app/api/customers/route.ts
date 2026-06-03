import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import {
  FIELD_LIMITS,
  badRequest,
  conflict,
  isValidationError,
  ok,
  parseBody,
  phoneFingerprint,
  validateEmail,
  validateString,
} from "@store/shared";

import { connectDB, Customer, Order, handleMongoError } from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";
import { toCustomerResponse, type CustomerLean } from "@/lib/serializers/customer";
import type { AdminCustomerSummary } from "@/types/models";

/** Placeholder city for manually-created customers — mirrors the storefront
 *  OTP upsert, which seeds the same value until the customer fills it in. */
const PLACEHOLDER_CITY = "—";

export async function GET(request: Request) {
  const { response } = await requireSession("customer_view");
  if (response) {
    return response;
  }

  await connectDB();
  const { page, limit, skip, search, searchPattern } = readListOptions(request);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { name: { $regex: searchPattern, $options: "i" } },
      { email: { $regex: searchPattern, $options: "i" } },
      { phoneNumber: { $regex: searchPattern, $options: "i" } },
      { city: { $regex: searchPattern, $options: "i" } },
    ];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<CustomerLean[]>(),
    Customer.countDocuments(filter),
  ]);

  const stats = await Order.aggregate<{
    _id: import("mongoose").Types.ObjectId;
    orderCount: number;
    lifetimeSpendRupees: number;
    lastOrderAt: Date;
  }>([
    { $match: { customerId: { $in: customers.map((customer) => customer._id) } } },
    {
      $group: {
        _id: "$customerId",
        orderCount: { $sum: 1 },
        lifetimeSpendRupees: { $sum: "$totals.totalRupees" },
        lastOrderAt: { $max: "$placedAt" },
      },
    },
  ]);
  const statsMap = new Map(
    stats.map((stat) => [
      stat._id.toString(),
      {
        orderCount: stat.orderCount,
        lifetimeSpendRupees: stat.lifetimeSpendRupees,
        lastOrderAt: stat.lastOrderAt,
      },
    ]),
  );

  const items: AdminCustomerSummary[] = customers.map((customer) => {
    const stat = statsMap.get(customer._id.toString()) ?? {
      orderCount: 0,
      lifetimeSpendRupees: 0,
      lastOrderAt: undefined,
    };
    const full = toCustomerResponse(customer, stat);
    return {
      id: full.id,
      name: full.name,
      email: full.email,
      phoneNumber: full.phoneNumber,
      city: full.city,
      isLoyaltyMember: full.isLoyaltyMember,
      loyaltyBalance: 0,
      loyaltyLifetimeEarned: 0,
      orderCount: full.orderCount,
      lifetimeSpendRupees: full.lifetimeSpendRupees,
      lastOrderAt: full.lastOrderAt,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    };
  });

  const payload: ListResponse<AdminCustomerSummary> = { items, total, page, limit };
  return ok(payload);
}

interface CustomerCreateInput {
  name?: unknown;
  phoneNumber?: unknown;
  email?: unknown;
  city?: unknown;
  isLoyaltyMember?: unknown;
  notes?: unknown;
}

/**
 * Manually create a customer record. Used when an operator needs to set up an
 * account for someone who can't self-register on the storefront (e.g. OTP
 * delivery is failing). The phone number becomes the customer's sign-in ID.
 */
export async function POST(request: Request) {
  const { actor, response } = await requireSession("customer_update");
  if (response) {
    return response;
  }

  const body = await parseBody<CustomerCreateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const nameResult = validateString(body.name, {
    label: "Name",
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const phoneRaw = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  if (!phoneRaw) {
    return badRequest("Phone number is required — it is the customer's sign-in ID.");
  }
  if (phoneRaw.length > FIELD_LIMITS.phoneNumber) {
    return badRequest("Phone number is too long.");
  }
  if (!phoneFingerprint(phoneRaw)) {
    return badRequest("Enter a valid phone number the customer will use to sign in.");
  }

  const create: Record<string, unknown> = {
    name: nameResult,
    phoneNumber: phoneRaw,
    city: PLACEHOLDER_CITY,
    isLoyaltyMember: Boolean(body.isLoyaltyMember),
    addresses: [],
  };

  if (typeof body.city === "string" && body.city.trim().length > 0) {
    const cityResult = validateString(body.city, { label: "City", max: FIELD_LIMITS.city });
    if (isValidationError(cityResult)) {
      return badRequest(cityResult.error);
    }
    create.city = cityResult;
  }
  if (typeof body.email === "string" && body.email.trim().length > 0) {
    const emailResult = validateEmail(body.email);
    if (isValidationError(emailResult)) {
      return badRequest(emailResult.error);
    }
    create.email = emailResult;
  }
  if (typeof body.notes === "string" && body.notes.trim().length > 0) {
    create.notes = body.notes.trim().slice(0, FIELD_LIMITS.crmNotes);
  }

  await connectDB();

  const existing = await Customer.findOne({ phoneNumber: phoneRaw }).lean<{ _id: unknown }>();
  if (existing) {
    return conflict("A customer with this phone number already exists.");
  }

  try {
    const doc = await Customer.create(create);

    await recordActivity({
      actor,
      action: "created",
      resourceType: "customer",
      resourceId: doc._id.toString(),
      resourceLabel: doc.name,
      detail: "Created manually in admin",
    });

    return ok(
      toCustomerResponse(doc.toObject() as CustomerLean, {
        orderCount: 0,
        lifetimeSpendRupees: 0,
        lastOrderAt: undefined,
      }),
    );
  } catch (error) {
    return handleMongoError(error);
  }
}
