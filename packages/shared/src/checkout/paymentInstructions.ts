/**
 * Checkout / order payment copy — maps UI payment chips to API values and
 * builds customer-facing “what to do next” steps after placing an order.
 */

import { formatPrice } from "../formatters";
import type { PaymentMethodId } from "../constants";

/** Values persisted on `Order.payment` (matches `@store/db`). */
export const ORDER_PAYMENT_METHODS = ["bank-transfer", "easypaisa", "jazzcash", "cod"] as const;
export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const CHECKOUT_TO_ORDER_PAYMENT: Record<PaymentMethodId, OrderPaymentMethod> = {
  bank: "bank-transfer",
  easypaisa: "easypaisa",
  jazzcash: "jazzcash",
  cod: "cod",
};

export const ORDER_TO_CHECKOUT_PAYMENT: Record<OrderPaymentMethod, PaymentMethodId> = {
  "bank-transfer": "bank",
  easypaisa: "easypaisa",
  jazzcash: "jazzcash",
  cod: "cod",
};

export function orderPaymentToCheckoutId(payment: OrderPaymentMethod): PaymentMethodId {
  return ORDER_TO_CHECKOUT_PAYMENT[payment];
}

export function isOrderPaymentMethod(value: string): value is OrderPaymentMethod {
  return (ORDER_PAYMENT_METHODS as readonly string[]).includes(value);
}

export interface PaymentInstructionCopy {
  title: string;
  steps: readonly string[];
  whatsappPrefill: string;
}

export function buildPaymentInstructions(input: {
  payment: OrderPaymentMethod;
  orderNumber: string;
  totalRupees: number;
  supportPhone: string;
}): PaymentInstructionCopy {
  const totalLabel = formatPrice(input.totalRupees);
  const orderRef = input.orderNumber;
  const whatsappBase = `Salam! I placed order ${orderRef} (${totalLabel}).`;

  switch (input.payment) {
    case "bank-transfer":
      return {
        title: "Complete your bank transfer",
        steps: [
          `Transfer ${totalLabel} in full and mention order ${orderRef} in the payment reference.`,
          `WhatsApp us a screenshot of the transfer to ${input.supportPhone} so we can confirm within 2 hours.`,
          "We pack your phone after payment clears — you'll get a QC video before dispatch.",
        ],
        whatsappPrefill: `${whatsappBase} I've sent the bank transfer — please share account details if needed.`,
      };
    case "easypaisa":
      return {
        title: "Send your Easypaisa advance",
        steps: [
          `Send ${totalLabel} via Easypaisa and mention order ${orderRef} in the note.`,
          `Message us on WhatsApp at ${input.supportPhone} with the transaction screenshot.`,
          "Your order moves to packing once we verify the payment.",
        ],
        whatsappPrefill: `${whatsappBase} I paid via Easypaisa — attaching screenshot.`,
      };
    case "jazzcash":
      return {
        title: "Send your JazzCash advance",
        steps: [
          `Send ${totalLabel} via JazzCash and mention order ${orderRef} in the note.`,
          `Message us on WhatsApp at ${input.supportPhone} with the transaction screenshot.`,
          "Your order moves to packing once we verify the payment.",
        ],
        whatsappPrefill: `${whatsappBase} I paid via JazzCash — attaching screenshot.`,
      };
    case "cod":
      return {
        title: "Cash on delivery / pickup",
        steps: [
          `Keep ${totalLabel} ready — we confirm the exact amount before dispatch.`,
          orderRef
            ? `Quote order ${orderRef} when our team calls or when you visit Hassan Centre.`
            : "Quote your order number when our team calls or when you visit Hassan Centre.",
          "Lahore COD is verified in person; courier COD may require a quick WhatsApp confirm.",
        ],
        whatsappPrefill: `${whatsappBase} I'd like to confirm COD / pickup details.`,
      };
    default: {
      const exhaustive: never = input.payment;
      return exhaustive;
    }
  }
}
