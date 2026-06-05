/**
 * Variant-level inventory reservation.
 *
 * Stock is held the moment an order is placed (`reserveStock`) and returned to
 * the pool when an order is cancelled / refunded / returned (`releaseStock`).
 * Both operate on `Product.variants[].quantity` — the single source of truth
 * the storefront reads to decide "in stock". There is no separate `isInStock`
 * flag.
 *
 * `reserveStock` is the oversell guard: each decrement is a conditional
 * `$inc` gated by `quantity >= requested`, so two checkouts racing for the
 * last unit can't both win. If any line in a multi-line order can't be
 * satisfied, the lines already applied are rolled back so the caller never
 * half-reserves an order.
 */

import { Types } from "mongoose";

import { logger } from "@store/shared";

import { Product } from "./models/Product";

export interface StockLine {
  productId: string | Types.ObjectId;
  variantId: string | Types.ObjectId;
  quantity: number;
}

export type StockReservationResult =
  | { ok: true }
  | { ok: false; failedLine: StockLine };

async function decrementVariant(line: StockLine): Promise<boolean> {
  const result = await Product.updateOne(
    { _id: line.productId },
    { $inc: { "variants.$[variant].quantity": -line.quantity } },
    { arrayFilters: [{ "variant._id": line.variantId, "variant.quantity": { $gte: line.quantity } }] },
  );
  return result.modifiedCount === 1;
}

/**
 * Atomically reserve every line. Returns `{ ok: false, failedLine }` (after
 * rolling back any lines already reserved) if a line lacks sufficient stock.
 */
export async function reserveStock(lines: StockLine[]): Promise<StockReservationResult> {
  const applied: StockLine[] = [];

  for (const line of lines) {
    if (line.quantity <= 0) {
      continue;
    }
    // Serial on purpose: each decrement is conditional and we must know
    // exactly which lines succeeded so we can roll them back on failure.
    const reserved = await decrementVariant(line);
    if (!reserved) {
      await releaseStock(applied);
      return { ok: false, failedLine: line };
    }
    applied.push(line);
  }

  return { ok: true };
}

/**
 * Return stock to the pool. Best-effort and idempotent at the call site —
 * callers gate this on an order-level `inventoryReserved` flag so a line is
 * never released twice.
 */
export async function releaseStock(lines: StockLine[]): Promise<void> {
  await Promise.all(
    lines.map(async (line) => {
      if (line.quantity <= 0) {
        return;
      }
      try {
        await Product.updateOne(
          { _id: line.productId },
          { $inc: { "variants.$[variant].quantity": line.quantity } },
          { arrayFilters: [{ "variant._id": line.variantId }] },
        );
      } catch (error) {
        logger.error(
          { error, productId: String(line.productId), variantId: String(line.variantId) },
          "Failed to release reserved stock",
        );
      }
    }),
  );
}
