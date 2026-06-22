/**
 * Order status transitions — the side-effect ledger.
 *
 * The PUT /admin/orders/[id] handler delegates here whenever an order changes
 * status. Centralising the logic keeps stock and loyalty in sync regardless
 * of which caller triggers a transition.
 *
 * Stock is reserved at placement (the storefront decrements variant
 * `quantity` when the order is created and sets `inventoryReserved: true`).
 * This service therefore only ever *releases* stock — and only once, gated by
 * the order's `inventoryReserved` flag so re-runs can't double-credit the pool.
 *
 * Transitions handled:
 *   any → delivered                    credit loyalty points (pointsEarned)
 *   any → cancelled/refunded/returned  release reserved stock; reverse credit
 *
 * Intentional non-goals: partial refunds and partial-quantity returns.
 */

import mongoose from "mongoose";

import { LoyaltyAccount, Order, releaseStock, type OrderDoc, type OrderStatus } from "@store/db";

import type { VerifiedUser } from "@/lib/permissions";
import { logger } from "@store/shared";

const STOCK_RELEASE_STATUSES: OrderStatus[] = ["cancelled", "refunded", "returned"];

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

	await releaseStockForTransition(order, nextStatus);
	await updateLoyaltyForTransition(order, previousStatus, nextStatus, actor);
}

async function releaseStockForTransition(order: OrderDoc, nextStatus: OrderStatus) {
	if (!STOCK_RELEASE_STATUSES.includes(nextStatus)) {
		return;
	}

	// Claim the release atomically: only the transition that flips
	// `inventoryReserved` true→false returns stock, so a re-saved or racing
	// transition can't credit the pool twice.
	const claimed = await Order.findOneAndUpdate({ _id: order._id, inventoryReserved: true }, { $set: { inventoryReserved: false } }).lean();
	if (!claimed) {
		return;
	}
	order.inventoryReserved = false;

	await releaseStock(
		order.items.map((line) => ({
			productId: line.productId,
			variantId: line.variantId,
			quantity: line.quantity,
		})),
	);
}

async function updateLoyaltyForTransition(order: OrderDoc, previousStatus: OrderStatus, nextStatus: OrderStatus, actor: VerifiedUser) {
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
			logger.info({ customerId: order.customerId.toString(), orderNumber: order.orderNumber }, "Skipping loyalty reversal — no account on file");
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
		logger.error({ error, orderNumber: order.orderNumber }, "Failed to update loyalty account during order transition");
	}
}
