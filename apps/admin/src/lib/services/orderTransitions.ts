/**
 * Order status transitions — the side-effect ledger.
 *
 * The PUT /admin/orders/[id] handler delegates here whenever an order changes
 * status. Centralising the logic keeps stock and loyalty in sync regardless
 * of which caller triggers a transition.
 *
 * Transitions handled:
 *   any → confirmed       reserve variant stock (isInStock=false)
 *   any → delivered       credit loyalty points (pointsEarned on the order)
 *   any → cancelled       release variant stock; reverse any prior credit
 *   any → refunded        release variant stock; reverse any prior credit
 *
 * Intentional non-goals: partial refunds, multi-item stock counts (the model
 * is binary isInStock per variant), and idempotent re-runs of the same
 * transition. Each transition either updates state or no-ops; we do not track
 * "already credited" and instead rely on the order PUT handler to reject
 * same-status re-saves.
 */

import mongoose from "mongoose";

import {
  LoyaltyAccount,
  Product,
  type OrderDoc,
  type OrderStatus,
} from "@store/db";

import type { VerifiedUser } from "@/lib/permissions";
import { logger } from "@store/shared";

type StockAction = "reserve" | "release" | "noop";

const STOCK_ACTION_BY_STATUS: Record<OrderStatus, StockAction> = {
  "pending-payment": "noop",
  confirmed: "reserve",
  dispatched: "noop",
  delivered: "noop",
  cancelled: "release",
  refunded: "release",
};

const LOYALTY_CREDITED_STATUSES: OrderStatus[] = ["delivered"];
const LOYALTY_REVERSED_STATUSES: OrderStatus[] = ["cancelled", "refunded"];

interface TransitionOptions {
  order: OrderDoc;
  previousStatus: OrderStatus;
  nextStatus: OrderStatus;
  actor: VerifiedUser;
}

export async function applyOrderTransition(options: TransitionOptions): Promise<void> {
  const { order, previousStatus, nextStatus, actor } = options;
  if (previousStatus === nextStatus) {
    return;
  }

  await updateStockForTransition(order, previousStatus, nextStatus);
  await updateLoyaltyForTransition(order, previousStatus, nextStatus, actor);
}

async function updateStockForTransition(
  order: OrderDoc,
  previousStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  const previousAction = STOCK_ACTION_BY_STATUS[previousStatus];
  const nextAction = STOCK_ACTION_BY_STATUS[nextStatus];
  if (previousAction === nextAction) {
    return;
  }

  const shouldReserve = nextAction === "reserve" && previousAction !== "reserve";
  const shouldRelease = nextAction === "release" && previousAction === "reserve";
  if (!shouldReserve && !shouldRelease) {
    return;
  }

  // Each order line points at one (productId, variantId). Group updates by
  // product so we issue one Mongo write per product, not one per line.
  const updatesByProductId = new Map<string, string[]>();
  for (const line of order.items) {
    const productKey = line.productId.toString();
    const variantKey = line.variantId.toString();
    const existing = updatesByProductId.get(productKey);
    if (existing) {
      existing.push(variantKey);
    } else {
      updatesByProductId.set(productKey, [variantKey]);
    }
  }

  const targetIsInStock = shouldRelease;
  await Promise.all(
    Array.from(updatesByProductId.entries()).map(async ([productId, variantIds]) => {
      try {
        await Product.updateOne(
          { _id: productId, "variants._id": { $in: variantIds } },
          { $set: { "variants.$[variant].isInStock": targetIsInStock } },
          { arrayFilters: [{ "variant._id": { $in: variantIds } }] },
        );
      } catch (error) {
        logger.error(
          { error, productId, variantIds, orderId: order._id?.toString() },
          "Failed to update variant stock during order transition",
        );
      }
    }),
  );
}

async function updateLoyaltyForTransition(
  order: OrderDoc,
  previousStatus: OrderStatus,
  nextStatus: OrderStatus,
  actor: VerifiedUser,
) {
  const wasCredited = LOYALTY_CREDITED_STATUSES.includes(previousStatus);
  const willCredit = LOYALTY_CREDITED_STATUSES.includes(nextStatus);
  const willReverse = LOYALTY_REVERSED_STATUSES.includes(nextStatus) && wasCredited;

  if (!willCredit && !willReverse) {
    return;
  }
  if (order.pointsEarned <= 0) {
    return;
  }

  try {
    // Auto-create the LoyaltyAccount the first time we credit a member. The
    // order endpoint already verified the customer is enrolled, so by the
    // time we reach `delivered` it's safe to assume they should have an
    // account. Reversal still skips when no account exists — there's nothing
    // to reverse.
    const account = willCredit
      ? await LoyaltyAccount.findOneAndUpdate(
          { customerId: order.customerId },
          {
            $setOnInsert: {
              customerId: order.customerId,
              balance: 0,
              lifetimeEarned: 0,
              pendingFromShipping: 0,
            },
          },
          { new: true, upsert: true },
        )
      : await LoyaltyAccount.findOne({ customerId: order.customerId });
    if (!account) {
      logger.info(
        { customerId: order.customerId.toString(), orderNumber: order.orderNumber },
        "Skipping loyalty reversal — no account on file",
      );
      return;
    }

    const recordedByUserId = new mongoose.Types.ObjectId(actor.id);

    if (willCredit) {
      account.balance += order.pointsEarned;
      account.lifetimeEarned += order.pointsEarned;
      account.transactions.push({
        kind: "earn",
        amount: order.pointsEarned,
        reason: `Earned on order ${order.orderNumber}`,
        orderRef: order.orderNumber,
        recordedByUserId,
        occurredAt: new Date(),
      });
    } else if (willReverse) {
      const reversal = Math.min(account.balance, order.pointsEarned);
      account.balance -= reversal;
      account.transactions.push({
        kind: "adjust",
        amount: -reversal,
        reason: `Reversed for ${nextStatus} order ${order.orderNumber}`,
        orderRef: order.orderNumber,
        recordedByUserId,
        occurredAt: new Date(),
      });
    }

    await account.save();
  } catch (error) {
    logger.error(
      { error, orderNumber: order.orderNumber },
      "Failed to update loyalty account during order transition",
    );
  }
}
