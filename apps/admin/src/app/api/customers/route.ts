import { requireSession } from "@/lib/api/requireSession";
import { readListOptions, type ListResponse } from "@/lib/api/listOptions";
import {
  FIELD_LIMITS,
  badRequest,
  conflict,
  created,
  isValidationError,
  ok,
  parseBody,
  validateEmail,
  validateString,
} from "@store/shared";

import {
  connectDB,
  Customer,
  handleMongoError,
  Order,
} from "@store/db";

import { recordActivity } from "@/lib/services/activityLog";

import { toCustomerResponse, type CustomerLean } from "@/lib/serializers/customer";
import type { AdminCustomerSummary } from "@/types/admin";

interface CustomerInput {
  name?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  city?: unknown;
  isLoyaltyMember?: unknown;
  notes?: unknown;
}

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

export async function POST(request: Request) {
  const { actor, response } = await requireSession("customer_manage");
  if (response) {
    return response;
  }

  const body = await parseBody<CustomerInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const nameResult = validateString(body.name, { label: "Name", max: FIELD_LIMITS.personName });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const phoneResult = validateString(body.phoneNumber, {
    label: "Phone number",
    max: FIELD_LIMITS.phoneNumber,
  });
  if (isValidationError(phoneResult)) {
    return badRequest(phoneResult.error);
  }

  const cityResult = validateString(body.city, { label: "City", max: FIELD_LIMITS.city });
  if (isValidationError(cityResult)) {
    return badRequest(cityResult.error);
  }

  let emailValue: string | undefined;
  if (typeof body.email === "string" && body.email.trim().length > 0) {
    const emailResult = validateEmail(body.email);
    if (isValidationError(emailResult)) {
      return badRequest(emailResult.error);
    }
    emailValue = emailResult;
  }

  await connectDB();
  // Block obvious duplicates so the same customer isn't created twice from
  // multiple admin tabs / phone-then-walk-in. We accept any minor variations
  // (whitespace) the input validators have already trimmed away.
  const duplicate = await Customer.findOne({ phoneNumber: phoneResult }).lean();
  if (duplicate) {
    return conflict("A customer with this phone number already exists.");
  }

  try {
    const doc = await Customer.create({
      name: nameResult,
      email: emailValue,
      phoneNumber: phoneResult,
      city: cityResult,
      isLoyaltyMember: body.isLoyaltyMember === true,
      notes:
        typeof body.notes === "string"
          ? body.notes.trim().slice(0, FIELD_LIMITS.crmNotes)
          : undefined,
      addresses: [],
    });
    await recordActivity({
      actor,
      action: "created",
      resourceType: "customer",
      resourceId: doc._id.toString(),
      resourceLabel: doc.name,
    });
    return created(toCustomerResponse(doc.toObject() as CustomerLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
