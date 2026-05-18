import { requireSession } from "@/lib/api/requireSession";
import {
  connectDB,
  Customer,
  handleMongoError,
  Order,
} from "@store/db";
import {
  FIELD_LIMITS,
  badRequest,
  conflict,
  isValidId,
  isValidationError,
  noContent,
  notFound,
  ok,
  parseBody,
  validateEmail,
  validateString,
} from "@store/shared";

import { recordActivity } from "@/lib/services/activityLog";
import { toCustomerResponse, type CustomerLean } from "@/lib/serializers/customer";

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
  const doc = await Customer.findById(id).lean<CustomerLean>();
  if (!doc) {
    return notFound("Customer not found");
  }

  const stats = await Order.aggregate<{
    orderCount: number;
    lifetimeSpendRupees: number;
    lastOrderAt: Date;
  }>([
    { $match: { customerId: doc._id } },
    {
      $group: {
        _id: null,
        orderCount: { $sum: 1 },
        lifetimeSpendRupees: { $sum: "$totals.totalRupees" },
        lastOrderAt: { $max: "$placedAt" },
      },
    },
  ]);

  const stat = stats[0] ?? { orderCount: 0, lifetimeSpendRupees: 0, lastOrderAt: undefined };
  return ok(toCustomerResponse(doc, stat));
}

interface CustomerUpdateInput {
  name?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  city?: unknown;
  isLoyaltyMember?: unknown;
  notes?: unknown;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("customer_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<CustomerUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  const update: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const result = validateString(body.name, { label: "Name", max: FIELD_LIMITS.personName });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.name = result;
  }
  if (body.phoneNumber !== undefined) {
    const result = validateString(body.phoneNumber, {
      label: "Phone number",
      max: FIELD_LIMITS.phoneNumber,
    });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.phoneNumber = result;
  }
  if (body.city !== undefined) {
    const result = validateString(body.city, { label: "City", max: FIELD_LIMITS.city });
    if (isValidationError(result)) {
      return badRequest(result.error);
    }
    update.city = result;
  }
  if (body.email !== undefined) {
    if (typeof body.email === "string" && body.email.trim().length === 0) {
      update.email = undefined;
    } else {
      const result = validateEmail(body.email);
      if (isValidationError(result)) {
        return badRequest(result.error);
      }
      update.email = result;
    }
  }
  if (body.isLoyaltyMember !== undefined) {
    update.isLoyaltyMember = Boolean(body.isLoyaltyMember);
  }
  if (typeof body.notes === "string") {
    update.notes = body.notes.trim().slice(0, FIELD_LIMITS.crmNotes);
  }

  if (Object.keys(update).length === 0) {
    return badRequest("No fields to update.");
  }

  await connectDB();
  if (typeof update.phoneNumber === "string") {
    const duplicate = await Customer.findOne({
      phoneNumber: update.phoneNumber,
      _id: { $ne: id },
    }).lean();
    if (duplicate) {
      return conflict("Another customer already uses this phone number.");
    }
  }

  try {
    const doc = await Customer.findByIdAndUpdate(id, { $set: update }, {
      new: true,
      runValidators: true,
    }).lean<CustomerLean>();
    if (!doc) {
      return notFound("Customer not found");
    }

    await recordActivity({
      actor,
      action: "updated",
      resourceType: "customer",
      resourceId: id,
      resourceLabel: doc.name,
    });
    return ok(toCustomerResponse(doc));
  } catch (error) {
    return handleMongoError(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("customer_manage");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  await connectDB();
  // Referential integrity — orders reference customers and we keep the
  // customerSnapshot for display, but a hard delete still leaves dangling
  // `customerId` foreign keys. Block the delete and prompt the admin to
  // archive instead (we keep customers around for lifetime stats).
  const orderCount = await Order.countDocuments({ customerId: id });
  if (orderCount > 0) {
    return conflict(
      `Cannot delete a customer with ${orderCount} order${orderCount === 1 ? "" : "s"}.`,
    );
  }

  try {
    const doc = await Customer.findByIdAndDelete(id).lean<CustomerLean>();
    if (!doc) {
      return notFound("Customer not found");
    }

    await recordActivity({
      actor,
      action: "deleted",
      resourceType: "customer",
      resourceId: id,
      resourceLabel: doc.name,
    });
    return noContent();
  } catch (error) {
    return handleMongoError(error);
  }
}
