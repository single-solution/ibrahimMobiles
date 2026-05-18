import type { Types } from "mongoose";
import type { OrderAttributes } from "@store/db";
import type { AdminOrder, AdminOrderSummary } from "@/types/admin";

export type OrderLean = OrderAttributes & { _id: Types.ObjectId };

export function summariseOrder(order: OrderLean): AdminOrderSummary {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    customer: {
      id: order.customerId.toString(),
      name: order.customerSnapshot.name,
      phoneNumber: order.customerSnapshot.phoneNumber,
      city: order.customerSnapshot.city,
    },
    status: order.status,
    totalRupees: order.totals.totalRupees,
    itemCount: order.items.reduce((sum, line) => sum + line.quantity, 0),
    payment: order.payment,
    delivery: order.delivery,
    placedAt: order.placedAt.toISOString(),
  };
}

export function toOrderResponse(order: OrderLean): AdminOrder {
  return {
    ...summariseOrder(order),
    items: order.items.map((line) => ({
      id: line._id?.toString() ?? "",
      productId: line.productId.toString(),
      variantId: line.variantId.toString(),
      productName: line.productName,
      variantSummary: line.variantSummary,
      unitPriceRupees: line.unitPriceRupees,
      quantity: line.quantity,
    })),
    totals: {
      subtotalRupees: order.totals.subtotalRupees,
      shippingRupees: order.totals.shippingRupees,
      discountRupees: order.totals.discountRupees,
      totalRupees: order.totals.totalRupees,
    },
    address: order.address
      ? {
          recipientName: order.address.recipientName,
          phoneNumber: order.address.phoneNumber,
          city: order.address.city,
          area: order.address.area,
          street: order.address.street,
          postalCode: order.address.postalCode,
        }
      : undefined,
    timeline: (order.timeline ?? []).map((entry) => ({
      id: entry._id?.toString() ?? "",
      status: entry.status,
      occurredAt: entry.occurredAt.toISOString(),
      note: entry.note,
    })),
    trackingNote: order.trackingNote,
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString(),
    pointsEarned: order.pointsEarned,
    pointsRedeemed: order.pointsRedeemed,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
