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
}

export interface DiscountApplication {
  offerId: string;
  offerTitle: string;
  discountAmount: number;
}

export function isOfferActiveSchedule(schedule: OfferSchedule, now = new Date()): boolean {
  if (schedule.startDate && now < new Date(schedule.startDate)) return false;
  if (schedule.endDate && now > new Date(schedule.endDate)) return false;

  if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
    if (!schedule.daysOfWeek.includes(now.getDay())) return false;
  }

  if (schedule.startTime || schedule.endTime) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    if (schedule.startTime) {
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      if (currentMinutes < startH * 60 + startM) return false;
    }

    if (schedule.endTime) {
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      if (currentMinutes > endH * 60 + endM) return false;
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
    case "attributes":
      // complex attribute matching
      // value shape: { slug: string, value: string }
      if (typeof condition.value === "object" && condition.value !== null) {
        const attrVal = item.attributes[condition.value.slug];
        if (Array.isArray(attrVal)) {
          return attrVal.includes(condition.value.value);
        }
        return attrVal === condition.value.value;
      }
      return false;
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

export function evaluateOffers(
  items: EvaluatableItem[],
  offers: ActiveOffer[]
) {
  let cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let totalDiscount = 0;

  const validOffers = offers.filter((offer) => isOfferActiveSchedule(offer.schedule));

  const itemDiscounts = new Map<string, DiscountApplication[]>();
  const cartDiscounts: DiscountApplication[] = [];

  let isLoyaltyPointsAllowed = true;
  let appliedStackableCount = 0;
  let appliedNonStackableCount = 0;

  // Sort offers by value/priority if needed. For now, apply sequentially.
  for (const offer of validOffers) {
    if (appliedNonStackableCount > 0) {
      break; // Only one non-stackable offer allowed
    }

    let appliesToCart = true;
    const matchedItems: EvaluatableItem[] = [];

    // Evaluate conditions
    for (const item of items) {
      const itemMatches = offer.conditions.every((cond) =>
        matchesCondition(item, cond, cartTotal)
      );
      if (itemMatches) {
        matchedItems.push(item);
      }
    }

    if (offer.conditions.length > 0 && matchedItems.length === 0) {
      appliesToCart = false;
    }

    if (!appliesToCart) continue;

    // Execute Action
    let offerDiscount = 0;

    if (offer.action.target === "cart_total") {
      if (offer.action.type === "percentage_discount") {
        offerDiscount = cartTotal * (offer.action.value / 100);
      } else if (offer.action.type === "fixed_amount_discount") {
        offerDiscount = Math.min(offer.action.value, cartTotal);
      }
      // buy_x_get_y and free_shipping handled differently or not at cart level for money discount
      
      if (offerDiscount > 0) {
        cartDiscounts.push({
          offerId: offer.id,
          offerTitle: offer.title,
          discountAmount: offerDiscount,
        });
        cartTotal -= offerDiscount;
        totalDiscount += offerDiscount;
      }
    } else if (offer.action.target === "matched_items") {
      for (const item of matchedItems) {
        let itemDiscount = 0;
        const itemLineTotal = item.price * item.quantity;
        if (offer.action.type === "percentage_discount") {
          itemDiscount = itemLineTotal * (offer.action.value / 100);
        } else if (offer.action.type === "fixed_amount_discount") {
          itemDiscount = Math.min(offer.action.value * item.quantity, itemLineTotal);
        }

        if (itemDiscount > 0) {
          const currentItemDiscounts = itemDiscounts.get(item.id) || [];
          currentItemDiscounts.push({
            offerId: offer.id,
            offerTitle: offer.title,
            discountAmount: itemDiscount,
          });
          itemDiscounts.set(item.id, currentItemDiscounts);
          totalDiscount += itemDiscount;
          cartTotal -= itemDiscount;
        }
      }
    }

    if (offerDiscount > 0 || itemDiscounts.size > 0) {
      if (!offer.allowLoyaltyPoints) {
        isLoyaltyPointsAllowed = false;
      }
      if (offer.isStackable) {
        appliedStackableCount++;
      } else {
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
  };
}
