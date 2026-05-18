import { requireSession } from "@/lib/api/requireSession";
import {
  badRequest,
  FIELD_LIMITS,
  isValidId,
  notFound,
  ok,
  parseBody,
} from "@store/shared";
import {
  connectDB,
  handleMongoError,
  Order,
  ORDER_STATUSES,
  type OrderStatus,
} from "@store/db";

import { bustAdminCaches } from "@/lib/cached";
import { recordActivity } from "@/lib/services/activityLog";
import { applyOrderTransition } from "@/lib/services/orderTransitions";
import { toOrderResponse, type OrderLean } from "@/lib/serializers/order";

const ALLOWED_STATUSES = new Set<string>(ORDER_STATUSES);

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
  const doc = await Order.findById(id).lean<OrderLean>();
  if (!doc) {
    return notFound("Order not found");
  }

  return ok(toOrderResponse(doc));
}

interface OrderUpdateInput {
  status?: unknown;
  trackingNote?: unknown;
  estimatedDeliveryAt?: unknown;
  timelineNote?: unknown;
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { actor, response } = await requireSession("order_update");
  if (response) {
    return response;
  }

  const { id } = await params;
  if (!isValidId(id)) {
    return badRequest("Invalid ID.");
  }

  const body = await parseBody<OrderUpdateInput>(request);
  if (body instanceof Response) {
    return body;
  }

  await connectDB();
  try {
    const order = await Order.findById(id);
    if (!order) {
      return notFound("Order not found");
    }

    const detailParts: string[] = [];
    const previousStatus = order.status;
    let nextStatus: OrderStatus | null = null;

    if (typeof body.status === "string") {
      if (!ALLOWED_STATUSES.has(body.status)) {
        return badRequest(`Status must be one of: ${ORDER_STATUSES.join(", ")}`);
      }
      const candidate = body.status as OrderStatus;
      if (order.status !== candidate) {
        order.status = candidate;
        nextStatus = candidate;
        order.timeline.push({
          status: candidate,
          occurredAt: new Date(),
          note:
            typeof body.timelineNote === "string"
              ? body.timelineNote.slice(0, FIELD_LIMITS.operatorNote)
              : undefined,
        });
        detailParts.push(`Status → ${candidate}`);
      }
    }
    if (typeof body.trackingNote === "string") {
      order.trackingNote = body.trackingNote.trim().slice(0, FIELD_LIMITS.operatorNote);
      detailParts.push("Tracking note updated");
    }
    if (body.estimatedDeliveryAt !== undefined) {
      const raw = body.estimatedDeliveryAt;
      const value = typeof raw === "string" && raw.length > 0 ? new Date(raw) : undefined;
      if (value && Number.isNaN(value.getTime())) {
        return badRequest("Invalid estimatedDeliveryAt date.");
      }
      order.estimatedDeliveryAt = value;
      detailParts.push("ETA updated");
    }

    await order.save();

    // Side-effects: stock reservation/release and loyalty credit/reversal.
    // Best-effort — failures are logged but do not roll back the status update,
    // because in a pre-owned shop the human admin is the source of truth.
    if (nextStatus) {
      await applyOrderTransition({
        order,
        previousStatus,
        nextStatus,
        actor,
      });
    }

    await recordActivity({
      actor,
      action: nextStatus ? "status_changed" : "updated",
      resourceType: "order",
      resourceId: id,
      resourceLabel: order.orderNumber,
      detail: detailParts.join(" · ") || undefined,
    });
    // Status changes flip dashboard KPIs (orders-today, sales, pending,
    // dispatched, refunds). Bust the admin cache so the operator sees
    // their action reflected on the very next page load.
    bustAdminCaches();

    return ok(toOrderResponse(order.toObject() as OrderLean));
  } catch (error) {
    return handleMongoError(error);
  }
}
