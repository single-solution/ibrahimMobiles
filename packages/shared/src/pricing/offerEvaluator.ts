import type { OfferCondition, OfferAction, OfferSchedule } from "./offerTypes";

export interface EvaluatableItem {
  id: string;
  productId: string;
  variantId: string;
  categorySlug: string;
  brandSlug: string;
  gradeSlug: string;
  price: number;
  quantity: number;
  attributes: Record<string, string | string[]>;
}

export interface ActiveOffer {
  id: string;
  title: string;
  conditions: OfferCondition[];
  action: OfferAction;
  schedule: OfferSchedule;
  isStackable: boolean;
  allowLoyaltyPoints: boolean;
  /** Max total redemptions; `undefined`/`0` means unlimited. */
  usageLimit?: number;
  /** Redemptions so far — used with `usageLimit` to retire exhausted offers. */
  usageCount?: number;
}

export interface DiscountApplication {
  offerId: string;
  offerTitle: string;
  discountAmount: number;
}

export interface OfferEvaluationResult {
  itemDiscounts: Map<string, DiscountApplication[]>;
  cartDiscounts: DiscountApplication[];
  totalDiscount: number;
  finalTotal: number;
  isLoyaltyPointsAllowed: boolean;
  /** True when an applicable offer grants free shipping. */
  freeShipping: boolean;
  /** IDs of offers that actually applied — used to bump `usageCount`. */
  appliedOfferIds: string[];
}

/** An offer is retired once it reaches a positive usage limit. */
function isOfferUsageExhausted(offer: ActiveOffer): boolean {
  return (
    typeof offer.usageLimit === "number" &&
    offer.usageLimit > 0 &&
    (offer.usageCount ?? 0) >= offer.usageLimit
  );
}

const MINUTES_IN_HOUR = 60;

export function isOfferActiveSchedule(schedule: OfferSchedule, now = new Date()): boolean {
  if (schedule.startDate && now < new Date(schedule.startDate)) return false;
  if (schedule.endDate && now > new Date(schedule.endDate)) return false;

  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    if (!schedule.daysOfWeek.includes(now.getDay())) return false;
  }

  if (schedule.startTime || schedule.endTime) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * MINUTES_IN_HOUR + minutes;

    if (schedule.startTime) {
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      if (currentMinutes < startH * MINUTES_IN_HOUR + startM) return false;
    }

    if (schedule.endTime) {
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      if (currentMinutes > endH * MINUTES_IN_HOUR + endM) return false;
    }
  }

  return true;
}

function matchesCondition(
  item: EvaluatableItem,
  condition: OfferCondition,
  cartTotal: number
): boolean {
  let itemValue: any;

  switch (condition.type) {
    case "products":
      itemValue = item.productId;
      break;
    case "categories":
      itemValue = item.categorySlug;
      break;
    case "brands":
      itemValue = item.brandSlug;
      break;
    case "grades":
      itemValue = item.gradeSlug;
      break;
    case "price_range":
      itemValue = item.price;
      break;
    case "cart_total":
      itemValue = cartTotal;
      break;
    case "attributes": {
      if (typeof condition.value !== "object" || condition.value === null) {
        return false;
      }
      const attrVal = item.attributes?.[condition.value.slug];
      if (Array.isArray(attrVal)) {
        return attrVal.includes(condition.value.value);
      }
      return attrVal === condition.value.value;
    }
    default:
      return false;
  }

  const targetValue = condition.value;

  switch (condition.operator) {
    case "in":
      if (Array.isArray(targetValue)) {
        return targetValue.includes(itemValue);
      }
      return targetValue === itemValue;
    case "not_in":
      if (Array.isArray(targetValue)) {
        return !targetValue.includes(itemValue);
      }
      return targetValue !== itemValue;
    case "between":
      if (Array.isArray(targetValue) && targetValue.length === 2) {
        return itemValue >= targetValue[0] && itemValue <= targetValue[1];
      }
      return false;
    case "gte":
      return itemValue >= targetValue;
    case "lte":
      return itemValue <= targetValue;
    default:
      return false;
  }
}

const PERCENTAGE_DIVISOR = 100;

export function evaluateOffers(
  items: EvaluatableItem[],
  offers: ActiveOffer[]
): OfferEvaluationResult {
  let cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let totalDiscount = 0;

  const validOffers = offers.filter(
    (offer) => isOfferActiveSchedule(offer.schedule) && !isOfferUsageExhausted(offer),
  );

  const itemDiscounts = new Map<string, DiscountApplication[]>();
  const cartDiscounts: DiscountApplication[] = [];
  const appliedOfferIds: string[] = [];

  let isLoyaltyPointsAllowed = true;
  let freeShipping = false;
  let appliedNonStackableCount = 0;

  // Apply sequentially in the order offers arrive (admin `sortOrder`). One
  // non-stackable offer ends the run; stackable offers keep accumulating.
  for (const offer of validOffers) {
    if (appliedNonStackableCount > 0) {
      break;
    }

    const matchedItems: EvaluatableItem[] = [];
    for (const item of items) {
      const itemMatches = offer.conditions.every((cond) =>
        matchesCondition(item, cond, cartTotal)
      );
      if (itemMatches) {
        matchedItems.push(item);
      }
    }

    // A conditioned offer only applies when at least one line matches; an
    // unconditioned offer applies to the whole cart.
    if (offer.conditions.length > 0 && matchedItems.length === 0) {
      continue;
    }

    let applied = false;

    if (offer.action.type === "free_shipping") {
      freeShipping = true;
      applied = true;
    } else {
      switch (offer.action.target) {
        case "cart_total": {
          let offerDiscount = 0;
          if (offer.action.type === "percentage_discount") {
            offerDiscount = cartTotal * (offer.action.value / PERCENTAGE_DIVISOR);
          } else if (offer.action.type === "fixed_amount_discount") {
            offerDiscount = Math.min(offer.action.value, cartTotal);
          }
          if (offerDiscount > 0) {
            cartDiscounts.push({
              offerId: offer.id,
              offerTitle: offer.title,
              discountAmount: offerDiscount,
            });
            cartTotal -= offerDiscount;
            totalDiscount += offerDiscount;
            applied = true;
          }
          break;
        }
        case "matched_items": {
          for (const item of matchedItems) {
            let itemDiscount = 0;
            const itemLineTotal = item.price * item.quantity;
            if (offer.action.type === "percentage_discount") {
              itemDiscount = itemLineTotal * (offer.action.value / PERCENTAGE_DIVISOR);
            } else if (offer.action.type === "fixed_amount_discount") {
              itemDiscount = Math.min(offer.action.value * item.quantity, itemLineTotal);
            }

            if (itemDiscount > 0) {
              const currentItemDiscounts = itemDiscounts.get(item.id) ?? [];
              currentItemDiscounts.push({
                offerId: offer.id,
                offerTitle: offer.title,
                discountAmount: itemDiscount,
              });
              itemDiscounts.set(item.id, currentItemDiscounts);
              totalDiscount += itemDiscount;
              cartTotal -= itemDiscount;
              applied = true;
            }
          }
          break;
        }
      }
    }

    if (applied) {
      appliedOfferIds.push(offer.id);
      if (!offer.allowLoyaltyPoints) {
        isLoyaltyPointsAllowed = false;
      }
      if (!offer.isStackable) {
        appliedNonStackableCount++;
      }
    }
  }

  return {
    itemDiscounts,
    cartDiscounts,
    totalDiscount,
    finalTotal: cartTotal,
    isLoyaltyPointsAllowed,
    freeShipping,
    appliedOfferIds,
  };
}
