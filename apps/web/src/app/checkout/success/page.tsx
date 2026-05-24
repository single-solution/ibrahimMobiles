import type { Metadata } from "next";

import { DECIMAL_RADIX, PAYMENT_METHOD_IDS, type PaymentMethodId } from "@store/shared";

import { CheckoutSuccess } from "@/components/checkout/CheckoutSuccess";

export const metadata: Metadata = {
  title: "Order placed",
  description: "Your order is confirmed and on its way.",
};

interface CheckoutSuccessPageProps {
  searchParams: Promise<{
    order?: string | string[];
    payment?: string | string[];
    total?: string | string[];
    earned?: string | string[];
    redeemed?: string | string[];
  }>;
}

function readNumberParam(value: string | string[] | undefined): number {
  if (!value || Array.isArray(value)) {
    return 0;
  }
  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function readPaymentParam(value: string | string[] | undefined): PaymentMethodId | null {
  if (!value || Array.isArray(value)) {
    return null;
  }
  return (PAYMENT_METHOD_IDS as readonly string[]).includes(value)
    ? (value as PaymentMethodId)
    : null;
}

function buildPlaceholderOrderNumber(): string {
  return `IM-${new Date().getFullYear()}-0000`;
}

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const orderNumber =
    typeof params.order === "string" ? params.order : buildPlaceholderOrderNumber();
  const payment = readPaymentParam(params.payment);
  const totalRupees = readNumberParam(params.total);
  const pointsEarned = readNumberParam(params.earned);
  const pointsRedeemed = readNumberParam(params.redeemed);
  return (
    <CheckoutSuccess
      orderNumber={orderNumber}
      payment={payment}
      totalRupees={totalRupees}
      pointsEarned={pointsEarned}
      pointsRedeemed={pointsRedeemed}
    />
  );
}
