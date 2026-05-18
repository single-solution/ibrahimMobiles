/**
 * DB → public storefront order shape.
 *
 * The customer never needs admin-only fields like `customerId`, internal
 * stripe references, agent notes, etc. This serializer also maps the raw
 * DB statuses ("pending-payment", "dispatched", …) to friendlier labels
 * the UI uses.
 */

import type {
  OrderAttributes,
  OrderStatus,
  OrderTimelineEntryAttributes,
} from "@store/db";

interface StorefrontOrderItem {
  id: string;
  productName: string;
  variantSummary: string;
  unitPriceRupees: number;
  quantity: number;
}

interface StorefrontOrderTotals {
  subtotalRupees: number;
  shippingRupees: number;
  discountRupees: number;
  totalRupees: number;
  itemCount: number;
}

export interface StorefrontOrderTimelineEntry {
  status: OrderStatus;
  label: string;
  description: string;
  occurredAt: string;
}

export interface StorefrontOrder {
  id: string;
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  /** Customer-facing label — "On the way", "Awaiting payment", etc. */
  statusLabel: string;
  items: StorefrontOrderItem[];
  delivery: OrderAttributes["delivery"];
  payment: OrderAttributes["payment"];
  customerName: string;
  customerPhone: string;
  city: string;
  address?: {
    recipientName: string;
    phoneNumber: string;
    city: string;
    area?: string;
    street?: string;
    postalCode?: string;
  };
  totals: StorefrontOrderTotals;
  timeline: StorefrontOrderTimelineEntry[];
  trackingNote?: string;
  estimatedDeliveryAt?: string;
  pointsEarned: number;
  pointsRedeemed: number;
}

/** Pretty status label shown to customers. */
const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  "pending-payment": "Awaiting payment",
  confirmed: "Confirmed",
  dispatched: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Short description shown next to a timeline entry. */
const TIMELINE_DESCRIPTION: Record<OrderStatus, string> = {
  "pending-payment": "We received your order and are waiting for payment.",
  confirmed: "Payment confirmed — we're packing your order.",
  dispatched: "Your package is with the courier.",
  delivered: "Your order arrived. Enjoy!",
  cancelled: "This order was cancelled.",
  refunded: "We refunded the order amount.",
};

/**
 * Convert a Mongoose lean Order to the public storefront shape.
 */
export function toStorefrontOrder(order: OrderAttributes & { _id: { toString(): string } }): StorefrontOrder {
  const itemCount = order.items.reduce((sum, line) => sum + line.quantity, 0);

  const timeline: StorefrontOrderTimelineEntry[] = (order.timeline ?? [])
    .slice()
    .sort(
      (left: OrderTimelineEntryAttributes, right: OrderTimelineEntryAttributes) =>
        left.occurredAt.getTime() - right.occurredAt.getTime(),
    )
    .map((entry) => ({
      status: entry.status,
      label: ORDER_STATUS_LABEL[entry.status] ?? entry.status,
      description: entry.note?.trim() || TIMELINE_DESCRIPTION[entry.status] || "",
      occurredAt: entry.occurredAt.toISOString(),
    }));

  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    placedAt: order.placedAt.toISOString(),
    status: order.status,
    statusLabel: ORDER_STATUS_LABEL[order.status] ?? order.status,
    items: order.items.map((line) => ({
      id: line._id?.toString() ?? `${line.productId.toString()}:${line.variantId.toString()}`,
      productName: line.productName,
      variantSummary: line.variantSummary,
      unitPriceRupees: line.unitPriceRupees,
      quantity: line.quantity,
    })),
    delivery: order.delivery,
    payment: order.payment,
    customerName: order.customerSnapshot.name,
    customerPhone: order.customerSnapshot.phoneNumber,
    city: order.customerSnapshot.city,
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
    totals: {
      subtotalRupees: order.totals.subtotalRupees,
      shippingRupees: order.totals.shippingRupees,
      discountRupees: order.totals.discountRupees,
      totalRupees: order.totals.totalRupees,
      itemCount,
    },
    timeline,
    trackingNote: order.trackingNote,
    estimatedDeliveryAt: order.estimatedDeliveryAt?.toISOString(),
    pointsEarned: order.pointsEarned ?? 0,
    pointsRedeemed: order.pointsRedeemed ?? 0,
  };
}
