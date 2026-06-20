/**
 * Authenticated storefront order placement.
 *
 * Critical security/UX rules:
 *
 *   - **Never trust client prices.** Every line's `unitPriceRupees` is
 *     re-read from the DB and re-computed server-side. Client-supplied price
 *     hints are ignored.
 *   - **Stock is reserved at placement.** Every line's variant `quantity` is
 *     atomically decremented under a `>= requested` guard (the oversell
 *     guard); the order carries `inventoryReserved: true`. Stock returns to
 *     the pool only when the order is cancelled / refunded / returned.
 *   - **Placement is idempotent.** A client-supplied `idempotencyKey` makes a
 *     retried submission return the original order instead of duplicating it.
 *   - **Customer identity comes from the session.** The client can submit a
 *     display name/address, but never chooses the customer record.
 *   - **Order numbers are unique even under contention.** A retry loop
 *     handles the rare same-second collision.
 *   - **Body & rate limits.** parseBody enforces a fixed body cap;
 *     enforcePublicRateLimit caps placements per signed-in customer within the
 *     short-burst window (see SHORT_BURST_WINDOW_MS).
 *
 * Loyalty points are earned only when the order transitions to `delivered`;
 * redeemed points are debited atomically here at placement, and refunded if
 * order creation fails.
 */

import { type Types } from "mongoose";

import {
  connectDB,
  createWithUniqueOrderNumber,
  Customer,
  isMongoDuplicateKeyError,
  LoyaltyAccount,
  Offer as OfferModel,
  Order as OrderModel,
  Product as ProductModel,
  releaseStock,
  reserveStock,
  getStoreSettings,
  type StockLine,
  type CustomerAddressAttributes,
  type CustomerAttributes,
  type DeliveryMethod,
  type OfferAttributes,
  type OrderDoc,
  type PaymentMethod,
  type ProductAttributes,
  type VariantAttributes,
} from "@store/db";
import {
  FIELD_LIMITS,
  badRequest,
  conflict,
  created,
  evaluateOffers,
  isValidId,
  isValidationError,
  logger,
  isVariantInStock,
  maxRedeemable,
  parseBody,
  pointsEarnedFor,
  pointsToRupees,
  serverError,
  SHORT_BURST_WINDOW_MS,
  unauthorized,
  validateString,
  type ActiveOffer,
  type EvaluatableItem,
  orderPaymentToCheckoutId,
  toActiveOffer,
} from "@store/shared";

import { enforcePublicRateLimit } from "@/lib/api/publicRateLimit";
import { enforceSameOrigin } from "@/lib/api/sameOrigin";
import { getVerifiedCustomer } from "@/lib/server/customerSession";

const ALLOWED_DELIVERY: ReadonlyArray<DeliveryMethod> = ["pickup", "courier"];
const ALLOWED_PAYMENT: ReadonlyArray<PaymentMethod> = [
  "bank-transfer",
  "easypaisa",
  "jazzcash",
  "cod",
];

const isDeliveryMethod = (value: unknown): value is DeliveryMethod =>
  typeof value === "string" && (ALLOWED_DELIVERY as readonly string[]).includes(value);
const isPaymentMethod = (value: unknown): value is PaymentMethod =>
  typeof value === "string" && (ALLOWED_PAYMENT as readonly string[]).includes(value);

const COURIER_FLAT_FEE_RUPEES = 1_500;
const MAX_LINES_PER_ORDER = 20;
/** Inclusive minimum quantity per cart line — anything below is a bad-request. */
const MIN_QUANTITY_PER_LINE = 1;
const MAX_QUANTITY_PER_LINE = 10;
/** Max order placements per IP+phone per `SHORT_BURST_WINDOW_MS`. */
const MAX_ORDERS_PER_WINDOW = 5;
/** Denominator used to convert a percent into a multiplier (e.g. 5 → 0.05). */
const PERCENT_DENOMINATOR = 100;

/** Inclusive minimum length for the customer's full name on checkout. */
const MIN_NAME_CHARS = 2;
/** Inclusive minimum length for a customer phone number — short enough to
 *  accept landline-style sequences while rejecting obvious typos. */
const MIN_PHONE_CHARS = 7;
const DEFAULT_CUSTOMER_CITY = "—";

interface OrderItemBody {
  productId?: unknown;
  variantId?: unknown;
  quantity?: unknown;
}

interface AddressBody {
  recipientName?: unknown;
  area?: unknown;
  street?: unknown;
  postalCode?: unknown;
}

interface CustomerBody {
  name?: unknown;
}

interface OrderBody {
  customer?: CustomerBody;
  items?: unknown;
  delivery?: unknown;
  payment?: unknown;
  address?: AddressBody;
  loyalty?: {
    redeemPoints?: unknown;
  };
  idempotencyKey?: unknown;
}

/** Max length we accept for a client-supplied idempotency key. */
const MAX_IDEMPOTENCY_KEY_CHARS = 80;

interface ResolvedItem {
  productDoc: ProductAttributes & { _id: Types.ObjectId };
  variant: VariantAttributes & { _id: Types.ObjectId };
  quantity: number;
}

export async function POST(request: Request) {
  const csrf = enforceSameOrigin(request);
  if (csrf) {
    return csrf;
  }

  const actor = await getVerifiedCustomer();
  if (!actor) {
    return unauthorized();
  }

  const parsed = await parseBody<OrderBody>(request);
  if (parsed instanceof Response) {
    return parsed;
  }
  const body = parsed;

  const limited = enforcePublicRateLimit(request, {
    scope: "storefront-order",
    identifier: actor.phoneNumber ?? actor.id,
    max: MAX_ORDERS_PER_WINDOW,
    windowMs: SHORT_BURST_WINDOW_MS,
  });
  if (limited) {
    return limited;
  }

  if (!isDeliveryMethod(body.delivery)) {
    return badRequest(`delivery must be one of: ${ALLOWED_DELIVERY.join(", ")}.`);
  }
  const delivery = body.delivery;
  if (!isPaymentMethod(body.payment)) {
    return badRequest(`payment must be one of: ${ALLOWED_PAYMENT.join(", ")}.`);
  }
  const payment = body.payment;

  // Items: at least one, at most MAX_LINES_PER_ORDER.
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return badRequest("Cart cannot be empty.");
  }
  if (body.items.length > MAX_LINES_PER_ORDER) {
    return badRequest(`Cart cannot contain more than ${MAX_LINES_PER_ORDER} lines.`);
  }

  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim().length > 0
      ? body.idempotencyKey.trim().slice(0, MAX_IDEMPOTENCY_KEY_CHARS)
      : undefined;

  await connectDB();

  // Idempotency: a retried submission (double-click, flaky network, second
  // tab) reuses its key — return the original order instead of placing a new
  // one. The unique index closes the simultaneous-request race at create time.
  if (idempotencyKey) {
    const priorOrder = await OrderModel.findOne({
      idempotencyKey,
      customerId: actor.id,
    }).lean<{ _id: Types.ObjectId; orderNumber: string; totals: { totalRupees: number }; pointsEarned: number; pointsRedeemed: number }>();
    if (priorOrder) {
      return created({
        id: priorOrder._id.toString(),
        orderNumber: priorOrder.orderNumber,
        totalRupees: priorOrder.totals.totalRupees,
        pointsEarned: priorOrder.pointsEarned,
        pointsRedeemed: priorOrder.pointsRedeemed,
      });
    }
  }

  const existingCustomer = await Customer.findById(actor.id).lean<
    CustomerAttributes & { _id: Types.ObjectId }
  >();
  if (!existingCustomer) {
    return unauthorized();
  }

  const customerNameInput =
    typeof body.customer?.name === "string" && body.customer.name.trim().length > 0
      ? body.customer.name
      : existingCustomer.name;
  const nameResult = validateString(customerNameInput, {
    label: "Name",
    min: MIN_NAME_CHARS,
    max: FIELD_LIMITS.personName,
  });
  if (isValidationError(nameResult)) {
    return badRequest(nameResult.error);
  }

  const phoneResult = validateString(existingCustomer.phoneNumber, {
    label: "Phone",
    min: MIN_PHONE_CHARS,
    max: FIELD_LIMITS.phoneNumber,
  });
  if (isValidationError(phoneResult)) {
    return badRequest(phoneResult.error);
  }

  const cityResult = resolveCustomerCity(existingCustomer.city);

  // Address required for courier deliveries — we never ship without one.
  let addressInput: ResolvedAddress | undefined;
  if (delivery === "courier") {
    addressInput = parseAddress(body.address, {
      fallbackName: nameResult,
      fallbackPhone: phoneResult,
      fallbackCity: cityResult,
    });
    if ("error" in addressInput) {
      return badRequest(addressInput.error);
    }
  }

  // Validate each cart line and collect IDs in one pass so we can run a
  // single `find($in)` round-trip below instead of N per-line queries.
  interface ValidatedLine {
    productId: string;
    variantId: string;
    quantity: number;
  }
  const productIds = new Set<string>();
  // Merge by product+variant so the same variant sent across two lines is
  // validated (and reserved) against one combined quantity — otherwise two
  // qty-1 lines could each pass a "1 in stock" check and oversell.
  const mergedLines = new Map<string, ValidatedLine>();
  for (const raw of body.items) {
    // `body.items` was confirmed to be an array above; each element still
    // arrives as a freshly-parsed JSON value, so we type it through the
    // all-`unknown` `OrderItemBody` shape and validate every field below.
    const line = raw as OrderItemBody;
    if (!isValidId(line.productId)) {
      return badRequest("Each item must include a valid productId.");
    }
    if (!isValidId(line.variantId)) {
      return badRequest("Each item must include a valid variantId.");
    }
    const quantity =
      typeof line.quantity === "number" ? line.quantity : Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity < MIN_QUANTITY_PER_LINE) {
      return badRequest(`Item quantity must be at least ${MIN_QUANTITY_PER_LINE}.`);
    }
    const key = `${line.productId}:${line.variantId}`;
    const existing = mergedLines.get(key);
    const combined = (existing?.quantity ?? 0) + Math.floor(quantity);
    if (combined > MAX_QUANTITY_PER_LINE) {
      return badRequest(`Quantity per line cannot exceed ${MAX_QUANTITY_PER_LINE}.`);
    }
    productIds.add(line.productId);
    mergedLines.set(key, {
      productId: line.productId,
      variantId: line.variantId,
      quantity: combined,
    });
  }
  const validatedLines: ValidatedLine[] = Array.from(mergedLines.values());
  const products = await ProductModel.find({
    _id: { $in: Array.from(productIds) },
    isActive: true,
    isArchived: { $ne: true },
  }).lean<(ProductAttributes & { _id: Types.ObjectId })[]>();
  const productMap = new Map(products.map((doc) => [doc._id.toString(), doc]));

  const resolvedItems: ResolvedItem[] = [];
  for (const line of validatedLines) {
    const product = productMap.get(line.productId);
    if (!product) {
      return conflict("One or more products are no longer available.");
    }
    const variant = product.variants.find(
      (candidate) => candidate._id?.toString() === line.variantId,
    );
    if (!variant) {
      return conflict(`Variant not found on ${product.name}.`);
    }
    if (
      !isVariantInStock({
        quantity: variant.quantity,
        forceOutOfStock:
          variant.forceOutOfStock === true ||
          (variant as { isActive?: boolean }).isActive === false,
      })
    ) {
      return conflict(`${product.name} is sold out.`);
    }
    if (variant.quantity < line.quantity) {
      return conflict(
        `${product.name} has only ${variant.quantity} in stock.`,
      );
    }
    // Mongoose's `lean()` returns embedded subdocs without `_id` typed as
    // ObjectId; the variant just came back from the same query as the parent
    // doc, so the cast is structurally a no-op.
    resolvedItems.push({
      productDoc: product,
      variant: variant as VariantAttributes & { _id: Types.ObjectId },
      quantity: line.quantity,
    });
  }

  // Totals — server-authoritative. Discount % and free-delivery threshold are
  // resolved from `StoreSettings` so the admin can change them without a deploy.
  const settings = await getStoreSettings();
  const subtotalRupees = resolvedItems.reduce(
    (sum, line) => sum + line.variant.priceRupees * line.quantity,
    0,
  );

  // Promotional offers — server-authoritative. The client computes the same
  // numbers for display, but the discount that actually bills the customer is
  // re-evaluated here from live offer documents so a tampered cart can't claim
  // a discount that doesn't apply. Schedule/usage-limit gating happens inside
  // `evaluateOffers`.
  const offerDocs = await OfferModel.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }).lean<
    (OfferAttributes & { _id: Types.ObjectId })[]
  >();
  const evaluatableItems: EvaluatableItem[] = resolvedItems.map((line) => ({
    id: line.variant._id.toString(),
    productId: line.productDoc._id.toString(),
    variantId: line.variant._id.toString(),
    categorySlug: line.productDoc.categorySlug,
    brandSlug: line.productDoc.brandSlug,
    gradeSlug: line.variant.gradeSlug ?? "",
    price: line.variant.priceRupees,
    quantity: line.quantity,
    attributes: line.variant.attributes ?? {},
  }));
  const offerPricing = evaluateOffers(evaluatableItems, offerDocs.map(toActiveOffer), {
    paymentMethod: orderPaymentToCheckoutId(payment),
  });
  const offerDiscountRupees = Math.round(offerPricing.totalDiscount);

  const paymentDiscountRupees =
    payment === "bank-transfer"
      ? Math.round((subtotalRupees * settings.bankTransferDiscountPercent) / PERCENT_DENOMINATOR)
      : 0;
  // Single discount line on the order = payment-method discount + offer engine.
  const discountRupees = paymentDiscountRupees + offerDiscountRupees;
  const shippingRupees =
    delivery === "courier" && !offerPricing.freeShipping
      ? subtotalRupees >= settings.freeDeliveryThresholdRupees
        ? 0
        : COURIER_FLAT_FEE_RUPEES
      : 0;
  const requestedRedeemPoints = Number(body.loyalty?.redeemPoints ?? 0);
  if (!Number.isFinite(requestedRedeemPoints) || requestedRedeemPoints < 0) {
    return badRequest("Redeemed points must be a positive number.");
  }
  const loyaltyAccount =
    requestedRedeemPoints > 0
      ? await LoyaltyAccount.findOne({ customerId: existingCustomer._id })
      : null;
  if (requestedRedeemPoints > 0 && !loyaltyAccount) {
    return badRequest("No loyalty balance is available for this customer.");
  }
  const pointsRedeemed = requestedRedeemPoints
    ? Math.floor(requestedRedeemPoints)
    : 0;
  if (pointsRedeemed > 0 && !offerPricing.isLoyaltyPointsAllowed) {
    return badRequest("Loyalty points can't be combined with the current offers.");
  }
  const maxRedeemablePoints = loyaltyAccount
    ? maxRedeemable(subtotalRupees, loyaltyAccount.balance)
    : 0;
  if (pointsRedeemed > maxRedeemablePoints) {
    return badRequest(`You can redeem up to ${maxRedeemablePoints} points on this order.`);
  }
  const pointsRedeemedRupees = pointsToRupees(pointsRedeemed);
  const totalRupees = Math.max(
    0,
    subtotalRupees - discountRupees + shippingRupees - pointsRedeemedRupees,
  );

  const nextAddresses =
    addressInput && "value" in addressInput
      ? mergeCheckoutAddress(existingCustomer.addresses ?? [], addressInput.value)
      : existingCustomer.addresses ?? [];

  // Reserve stock up front — this is the oversell guard. `reserveStock` rolls
  // its own partial reservations back, so a failure leaves inventory untouched.
  const stockLines: StockLine[] = resolvedItems.map((line) => ({
    productId: line.productDoc._id,
    variantId: line.variant._id,
    quantity: line.quantity,
  }));

  let createdOrder: OrderDoc | null = null;
  let reservation: { ok: boolean } | null = null;
  let customerDoc: { _id: Types.ObjectId; isLoyaltyMember: boolean } | null = null;
  try {
    customerDoc = await Customer.findByIdAndUpdate(
      existingCustomer._id,
      {
        name: nameResult,
        city: cityResult,
        isLoyaltyMember: true,
        ...(addressInput && "value" in addressInput ? { addresses: nextAddresses } : {}),
      },
      { new: true, runValidators: true },
    ).lean<{ _id: Types.ObjectId; isLoyaltyMember: boolean }>();

    if (!customerDoc) {
      logger.error("Customer upsert returned null — cannot continue");
      return badRequest("Could not place order.");
    }

    // Compute the points the customer *will* earn once the order ships. The
    // orderTransitions service only actually credits this on the `delivered`
    // transition.
    // Using `subtotalRupees` so a payment discount doesn't shrink the reward.
    const pointsEarned = pointsEarnedFor(subtotalRupees, settings.loyaltyEarnPercent);

    reservation = await reserveStock(stockLines);
    if (!reservation.ok) {
      return conflict("Some items just sold out. Please review your cart and try again.");
    }

    createdOrder = await createWithUniqueOrderNumber<OrderDoc>((orderNumber) =>
      OrderModel.create({
        orderNumber,
        customerId: customerDoc!._id,
        customerSnapshot: {
          name: nameResult,
          phoneNumber: phoneResult,
          city: cityResult,
        },
        status: "pending-payment",
        items: resolvedItems.map((line) => ({
          productId: line.productDoc._id,
          variantId: line.variant._id,
          productName: line.productDoc.name,
          variantSummary: buildVariantSummary(line.variant),
          unitPriceRupees: line.variant.priceRupees,
          quantity: line.quantity,
        })),
        delivery,
        payment,
        address: addressInput && "value" in addressInput ? addressInput.value : undefined,
        totals: {
          subtotalRupees,
          shippingRupees,
          discountRupees,
          totalRupees,
        },
        timeline: [
          {
            status: "pending-payment",
            occurredAt: new Date(),
            note: "Order placed via storefront.",
          },
        ],
        pointsEarned,
        pointsRedeemed,
        inventoryReserved: true,
        idempotencyKey,
        placedAt: new Date(),
      }),
    );

    // Debit redeemed points atomically — the `balance >= pointsRedeemed` guard
    // prevents two concurrent checkouts from overspending the same balance.
    if (pointsRedeemed > 0) {
      const debited = await LoyaltyAccount.findOneAndUpdate(
        { customerId: customerDoc!._id, balance: { $gte: pointsRedeemed } },
        {
          $inc: { balance: -pointsRedeemed },
          $push: {
            transactions: {
              kind: "redeem",
              amount: pointsRedeemed,
              occurredAt: new Date(),
              reason: "Redeemed during storefront checkout.",
              orderRef: createdOrder.orderNumber,
            },
          },
        },
      );
      if (!debited) {
        await createdOrder.deleteOne();
        await releaseStock(stockLines);
        return conflict("Your loyalty balance changed. Please review your points and try again.");
      }
    }

    // Best-effort usage tracking — a failure here must not fail a placed order.
    if (offerPricing.appliedOfferIds.length > 0) {
      try {
        await OfferModel.updateMany(
          { _id: { $in: offerPricing.appliedOfferIds } },
          { $inc: { "constraints.usageCount": 1 } },
        );
      } catch (error) {
        logger.warn({ error }, "Failed to increment offer usage counts");
      }
    }

    return created({
      id: createdOrder._id.toString(),
      orderNumber: createdOrder.orderNumber,
      totalRupees,
      pointsEarned,
      pointsRedeemed,
    });
  } catch (error) {
    // Unwind everything this attempt did so a failure never leaves stock held
    // or a half-created order behind.
    if (createdOrder) {
      await createdOrder.deleteOne().catch(() => undefined);
    }
    if (reservation?.ok) {
      await releaseStock(stockLines);
    }

    // A duplicate idempotency key means a parallel submission won the race —
    // return that order instead of surfacing an error.
    if (isMongoDuplicateKeyError(error) && idempotencyKey) {
      const winner = await OrderModel.findOne({
        idempotencyKey,
        customerId: customerDoc?._id ?? existingCustomer._id,
      }).lean<{ _id: Types.ObjectId; orderNumber: string; totals: { totalRupees: number }; pointsEarned: number; pointsRedeemed: number }>();
      if (winner) {
        return created({
          id: winner._id.toString(),
          orderNumber: winner.orderNumber,
          totalRupees: winner.totals.totalRupees,
          pointsEarned: winner.pointsEarned,
          pointsRedeemed: winner.pointsRedeemed,
        });
      }
    }

    logger.error({ error }, "Failed to create storefront order");
    return serverError("Could not place order. Please try again.");
  }
}


interface ResolvedAddressOk {
  value: {
    recipientName: string;
    phoneNumber: string;
    city: string;
    area?: string;
    street?: string;
    postalCode?: string;
  };
}
interface ResolvedAddressError {
  error: string;
}
type ResolvedAddress = ResolvedAddressOk | ResolvedAddressError;

interface AddressFallbacks {
  fallbackName: string;
  fallbackPhone: string;
  fallbackCity: string;
}

function parseAddress(
  input: AddressBody | undefined,
  fallbacks: AddressFallbacks,
): ResolvedAddress {
  if (!input) {
    return { error: "Delivery address is required for courier orders." };
  }
  const recipient = validateString(input.recipientName || fallbacks.fallbackName, {
    label: "Recipient name",
    min: 2,
    max: FIELD_LIMITS.recipientName,
  });
  if (isValidationError(recipient)) {
    return { error: recipient.error };
  }

  let area: string | undefined;
  if (typeof input.area === "string" && input.area.trim().length > 0) {
    const result = validateString(input.area, {
      label: "Area",
      max: FIELD_LIMITS.addressArea,
      required: false,
    });
    if (isValidationError(result)) {
      return { error: result.error };
    }
    area = result;
  }
  let street: string | undefined;
  if (typeof input.street === "string" && input.street.trim().length > 0) {
    const result = validateString(input.street, {
      label: "Street",
      max: FIELD_LIMITS.addressStreet,
      required: false,
    });
    if (isValidationError(result)) {
      return { error: result.error };
    }
    street = result;
  }
  let postalCode: string | undefined;
  if (typeof input.postalCode === "string" && input.postalCode.trim().length > 0) {
    const result = validateString(input.postalCode, {
      label: "Postal code",
      max: FIELD_LIMITS.postalCode,
      required: false,
    });
    if (isValidationError(result)) {
      return { error: result.error };
    }
    postalCode = result;
  }

  return {
    value: {
      recipientName: recipient,
      phoneNumber: fallbacks.fallbackPhone,
      city: fallbacks.fallbackCity,
      area,
      street,
      postalCode,
    },
  };
}

function resolveCustomerCity(city: string | undefined): string {
  const trimmed = city?.trim();
  if (!trimmed || trimmed === "—") {
    return DEFAULT_CUSTOMER_CITY;
  }
  return trimmed.slice(0, FIELD_LIMITS.city);
}

function mergeCheckoutAddress(
  addresses: CustomerAddressAttributes[],
  checkoutAddress: ResolvedAddressOk["value"],
): CustomerAddressAttributes[] {
  const nextAddress: CustomerAddressAttributes = {
    ...checkoutAddress,
    label: "Checkout",
    isDefault: true,
  };
  if (addresses.length === 0) {
    return [nextAddress];
  }
  const defaultIndex = addresses.findIndex((address) => address.isDefault);
  const replaceIndex = defaultIndex >= 0 ? defaultIndex : 0;
  return addresses.map((address, index) =>
    index === replaceIndex
      ? nextAddress
      : {
          ...address,
          isDefault: false,
        },
  );
}

/**
 * Build a human-readable variant summary for the order item — admins read
 * this in the admin order list, customers see it on their receipt.
 *
 * Phase 1: variant differentiators live on the admin-defined `attributes` map
 * (admin-defined per category). We join the attribute *values* in
 * insertion order followed by the grade slug; the storefront has the
 * actual `Grade.label` cached and uses it on the order detail page.
 */

function buildVariantSummary(variant: VariantAttributes): string {
  const parts: string[] = [];
  const attributes = variant.attributes ?? {};
  for (const value of Object.values(attributes)) {
    if (typeof value === "string" && value.trim().length > 0) {
      parts.push(value);
    }
  }
  if (variant.gradeSlug) {
    parts.push(humaniseSlug(variant.gradeSlug));
  }
  return parts.join(" · ").slice(0, FIELD_LIMITS.shortText);
}

function humaniseSlug(slug: string): string {
  if (!slug) {
    return slug;
  }
  return slug
    .split("-")
    .map((segment) =>
      segment.length === 0 ? segment : segment[0].toUpperCase() + segment.slice(1),
    )
    .join(" ");
}
